"""
AI润色 API - Vercel Serverless Function
调用 DeepSeek API 实现文本润色功能

支持模式:
- academic: 学术风格
- business: 商务风格
- literary: 文学风格
- daily: 日常风格

环境变量:
- DEEPSEEK_API_KEY: DeepSeek API密钥
"""

import os
import json
import urllib.request
import urllib.error


def get_mode_instruction(mode):
    """获取不同润色方向的提示词"""
    modes = {
        'academic': '''请将以下文本润色为学术风格，要求：
1. 语言严谨规范，表达准确
2. 逻辑清晰，论证严密
3. 使用规范的学术用语
4. 保持原文的核心观点

原文：
''',
        'business': '''请将以下文本润色为商务风格，要求：
1. 语言专业得体，礼貌谦逊
2. 表达清晰简洁，重点突出
3. 使用规范的商务用语
4. 适合商务邮件和正式场合

原文：
''',
        'literary': '''请将以下文本润色为文学风格，要求：
1. 语言优美流畅，文采斐然
2. 善用修辞，增加文学性
3. 情感表达细腻动人
4. 使文章更具艺术感染力

原文：
''',
        'daily': '''请将以下文本润色为日常风格，要求：
1. 语言自然亲切，易于理解
2. 表达轻松随和，亲切友好
3. 保持口语化的自然感
4. 适合日常交流和社交媒体

原文：
'''
    }
    return modes.get(mode, modes['daily'])


def handler(request):
    """
    处理文本润色请求
    
    Method: POST
    Content-Type: application/json
    
    参数:
    - text: 需要润色的原文
    - mode: 润色方向 (academic/business/literary/daily)
    
    返回:
    - 成功: {"result": "润色后的文本"}
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
    
    # 处理GET请求，返回使用说明
    if request.method == 'GET':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'name': 'AI润色 API',
                'method': 'POST',
                'params': {
                    'text': '需要润色的原文（必填）',
                    'mode': '润色风格: academic/business/literary/daily（默认academic）'
                },
                'example': {
                    'text': '这个产品非常好用',
                    'mode': 'business'
                }
            }, ensure_ascii=False, indent=2)
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
        mode = body.get('mode', 'academic')
        
        if not text:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': '请输入需要润色的文本'})
            }
        
        if len(text) > 2000:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': '文本长度不能超过2000字'})
            }
        
        # 构建提示词
        instruction = get_mode_instruction(mode)
        prompt = f"""请将以下文本进行润色优化：

{instruction}{text}

请直接输出润色后的文本，不要添加任何前缀或解释。"""
        
        # 调用DeepSeek API
        api_url = 'https://api.deepseek.com/v1/chat/completions'
        
        payload = {
            'model': 'deepseek-chat',
            'messages': [
                {'role': 'system', 'content': '你是一位专业的文字编辑润色专家，擅长将文本优化为不同的风格。请直接输出润色结果，不要添加任何前缀或解释。'},
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
        
        # 提取润色结果
        if 'choices' in result and len(result['choices']) > 0:
            polished_text = result['choices'][0]['message']['content'].strip()
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'result': polished_text})
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
