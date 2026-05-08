"""
AI文案改写 API - Vercel Serverless Function
调用 DeepSeek API 实现文案改写功能

支持模式:
- colloquial: 口语化
- formal: 正式
- creative: 创意
- simplify: 简化
- expand: 扩展

环境变量:
- DEEPSEEK_API_KEY: DeepSeek API密钥
"""

import os
import json
import urllib.request
import urllib.error


def get_mode_instruction(mode):
    """获取不同模式的提示词"""
    modes = {
        'colloquial': '将以下文案改写为口语化风格，表达自然轻松，适合日常交流：',
        'formal': '将以下文案改写为正式商务风格，表达专业得体，适合正式场合：',
        'creative': '用更有创意的表达方式改写以下文案，增加文采和吸引力：',
        'simplify': '简化以下文案，去除冗余表达，保留核心信息：',
        'expand': '扩展以下文案，增加细节描写，使内容更丰富生动：'
    }
    return modes.get(mode, modes['colloquial'])


def handler(request):
    """
    处理文案改写请求
    
    Method: POST
    Content-Type: application/json
    
    参数:
    - text: 需要改写的原文
    - mode: 改写模式 (colloquial/formal/creative/simplify/expand)
    
    返回:
    - 成功: {"result": "改写后的文案"}
    - 失败: {"error": "错误信息"}
    """
    
    # 设置CORS头
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    # 处理OPTIONS预检请求
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    # 只处理POST请求
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    # 获取API密钥
    api_key = os.environ.get('DEEPSEEK_API_KEY')
    if not api_key:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'API密钥未配置，请联系管理员'})
        }
    
    try:
        # 解析请求体
        if request.headers.get('Content-Type') == 'application/json':
            body = json.loads(request.body)
        else:
            body = json.loads(request.body.decode('utf-8'))
        
        text = body.get('text', '').strip()
        mode = body.get('mode', 'colloquial')
        
        if not text:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': '请输入需要改写的文案'})
            }
        
        if len(text) > 2000:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': '文案长度不能超过2000字'})
            }
        
        # 构建提示词
        instruction = get_mode_instruction(mode)
        prompt = f"""请将以下文案进行改写：

{instruction}

原文：
{text}

请直接输出改写后的文案，不需要额外解释。"""
        
        # 调用DeepSeek API
        api_url = 'https://api.deepseek.com/v1/chat/completions'
        
        payload = {
            'model': 'deepseek-chat',
            'messages': [
                {'role': 'system', 'content': '你是一位专业的文案改写专家，擅长将文案改写成不同的风格。请直接输出改写结果，不要添加任何前缀或解释。'},
                {'role': 'user', 'content': prompt}
            ],
            'temperature': 0.7,
            'max_tokens': 2000
        }
        
        req = urllib.request.Request(
            api_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        # 提取改写结果
        if 'choices' in result and len(result['choices']) > 0:
            rewritten_text = result['choices'][0]['message']['content'].strip()
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'result': rewritten_text})
            }
        else:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'error': 'API返回格式错误'})
            }
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            error_msg = error_data.get('error', {}).get('message', 'API请求失败')
        except:
            error_msg = f'HTTP错误: {e.code}'
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': error_msg})
        }
        
    except urllib.error.URLError as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'网络错误: {str(e.reason)}'})
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': '请求格式错误'})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'处理失败: {str(e)}'})
        }
