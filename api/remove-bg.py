"""
AI去背景 API - Vercel Serverless Function
调用 remove.bg API 实现图片去背景功能

环境变量:
- REMOVE_BG_API_KEY: remove.bg API密钥
"""

import os
import base64
import json
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError


def handler(request):
    """
    处理去背景请求
    
    Method: POST
    Content-Type: multipart/form-data
    
    参数:
    - image: 上传的图片文件
    
    返回:
    - 成功: 处理后的图片 (PNG格式)
    - 失败: JSON错误信息
    """
    
    # 只处理POST请求
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'body': json.dumps({'error': 'Method not allowed'}),
            'headers': {'Content-Type': 'application/json'}
        }
    
    # 获取API密钥
    api_key = os.environ.get('REMOVE_BG_API_KEY')
    if not api_key:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'API密钥未配置，请联系管理员'}),
            'headers': {'Content-Type': 'application/json'}
        }
    
    try:
        # 获取上传的文件
        if 'image' not in request.files:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': '请上传图片文件'}),
                'headers': {'Content-Type': 'application/json'}
            }
        
        file = request.files['image']
        
        # 检查文件大小 (最大10MB)
        file.seek(0, 2)  # 跳到文件末尾
        file_size = file.tell()
        file.seek(0)  # 回到文件开头
        
        if file_size > 10 * 1024 * 1024:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': '文件大小不能超过10MB'}),
                'headers': {'Content-Type': 'application/json'}
            }
        
        # 读取文件内容
        image_data = file.read()
        
        # 调用 remove.bg API
        result_image = call_remove_bg_api(api_key, image_data)
        
        # 返回处理后的图片
        return {
            'statusCode': 200,
            'body': base64.b64encode(result_image).decode('utf-8'),
            'headers': {
                'Content-Type': 'image/png',
                'Content-Transfer-Encoding': 'base64'
            },
            'isBase64Encoded': True
        }
        
    except ValueError as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': str(e)}),
            'headers': {'Content-Type': 'application/json'}
        }
    except Exception as e:
        print(f"处理错误: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': '处理失败，请重试'}),
            'headers': {'Content-Type': 'application/json'}
        }


def call_remove_bg_api(api_key, image_data):
    """
    调用 remove.bg API
    
    参数:
    - api_key: API密钥
    - image_data: 图片数据 (bytes)
    
    返回:
    - 处理后的图片数据 (bytes)
    """
    api_url = 'https://api.remove.bg/v1.0/removebg'
    
    # 构建请求
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    
    # 构建 multipart form data
    data = b''
    data += f'--{boundary}\r\n'.encode()
    data += b'Content-Disposition: form-data; name="image_file"; filename="image.png"\r\n'
    data += b'Content-Type: image/png\r\n\r\n'
    data += image_data
    data += b'\r\n'
    
    # 添加输出格式参数
    data += f'--{boundary}\r\n'.encode()
    data += b'Content-Disposition: form-data; name="size"\r\n\r\n'
    data += b'auto\r\n'
    
    # 添加格式参数
    data += f'--{boundary}\r\n'.encode()
    data += b'Content-Disposition: form-data; name="format"\r\n\r\n'
    data += b'png\r\n'
    
    data += f'--{boundary}--\r\n'.encode()
    
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': f'multipart/form-data; boundary={boundary}'
    }
    
    req = Request(api_url, data=data, headers=headers, method='POST')
    
    try:
        with urlopen(req, timeout=30) as response:
            result = response.read()
            return result
    except HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"API错误: {e.code} - {error_body}")
        raise ValueError(f"API调用失败: {e.code}")
    except URLError as e:
        print(f"网络错误: {str(e)}")
        raise ValueError("网络连接失败，请检查网络后重试")


# Vercel Serverless Function 入口
def main(request):
    """Vercel 入口函数"""
    return handler(request)


# 本地测试
if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        # 测试模式：读取本地图片
        with open(sys.argv[1], 'rb') as f:
            test_image = f.read()
        
        # 需要设置环境变量 REMOVE_BG_API_KEY
        api_key = os.environ.get('REMOVE_BG_API_KEY', 'your-api-key-here')
        
        if api_key == 'your-api-key-here':
            print("请先设置 REMOVE_BG_API_KEY 环境变量")
            sys.exit(1)
        
        try:
            result = call_remove_bg_api(api_key, test_image)
            
            # 保存结果
            with open('result.png', 'wb') as f:
                f.write(result)
            
            print("处理成功，结果已保存到 result.png")
        except Exception as e:
            print(f"处理失败: {str(e)}")
