"""
PSD解析和切图 API - Vercel Serverless Function
使用 psd-tools 解析PSD文件结构和图层

环境变量:
- 无需特殊环境变量

注意:
- Vercel Serverless Function 有 10s 超时和 50MB 响应限制
- 大型PSD文件可能需要特殊处理
"""

import os
import io
import json
import zipfile
import base64
from PIL import Image
import traceback


def handler(request):
    """
    处理PSD解析和切图请求
    
    Method: POST
    Content-Type: application/json 或 multipart/form-data
    
    请求类型:
    1. 解析PSD结构:
       {"action": "parse", "fileName": "xxx.psd"}
       同时需要在 files 中上传 PSD 文件
    
    2. 切图:
       {"action": "cut", "fileName": "xxx.psd", "selectedLayers": [...], "settings": {...}}
       同时需要在 files 中上传 PSD 文件
    
    参数说明:
    - action: 操作类型 (parse/cut)
    - selectedLayers: 选中的图层ID数组
    - settings: 切图设置
        - format: 输出格式 (png/jpg)
        - jpgQuality: JPG质量 (0.0-1.0)
        - autoCrop: 自动裁剪透明区域
        - includeHidden: 包含隐藏图层
        - usePrefix: 启用前缀规则
        - groupSubdir: 按图层组创建子目录
        - minSizeFilter: 过滤小尺寸图层
        - padding: 内边距
    """
    
    # 只处理POST请求
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'body': json.dumps({'error': 'Method not allowed'}),
            'headers': {'Content-Type': 'application/json'}
        }
    
    try:
        # 解析请求数据
        content_type = request.headers.get('Content-Type', '')
        
        if 'multipart/form-data' in content_type:
            # 文件上传模式
            if 'file' not in request.files:
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': '请上传PSD文件'}),
                    'headers': {'Content-Type': 'application/json'}
                }
            
            psd_file = request.files['file']
            file_name = psd_file.filename
            
            # 解析请求体获取其他参数
            try:
                body_data = json.loads(request.body.decode('utf-8'))
            except:
                body_data = {}
                
        elif 'application/json' in content_type:
            # JSON模式 (仅用于切图，需要先上传文件)
            body_data = request.json
            file_name = body_data.get('fileName', 'unknown.psd')
            
            # 这个模式需要文件已经在某处存储
            # 暂时不支持
            return {
                'statusCode': 400,
                'body': json.dumps({'error': '请使用 multipart/form-data 格式上传文件'}),
                'headers': {'Content-Type': 'application/json'}
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': '不支持的Content-Type'}),
                'headers': {'Content-Type': 'application/json'}
            }
        
        # 获取操作类型
        action = body_data.get('action', 'parse')
        
        # 检查文件大小
        psd_file.seek(0, 2)
        file_size = psd_file.tell()
        psd_file.seek(0)
        
        if file_size > 50 * 1024 * 1024:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'PSD文件太大，请使用50MB以内的文件'}),
                'headers': {'Content-Type': 'application/json'}
            }
        
        # 读取文件数据
        psd_data = psd_file.read()
        
        if action == 'parse':
            return parse_psd(file_name, psd_data)
        elif action == 'cut':
            selected_layers = body_data.get('selectedLayers', [])
            settings = body_data.get('settings', {})
            return cut_psd(file_name, psd_data, selected_layers, settings)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'不支持的操作: {action}'}),
                'headers': {'Content-Type': 'application/json'}
            }
            
    except Exception as e:
        print(f"处理错误: {str(e)}")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'处理失败: {str(e)}'}),
            'headers': {'Content-Type': 'application/json'}
        }


def parse_psd(file_name, psd_data):
    """
    解析PSD文件结构
    
    返回:
    - PSD基本信息 (尺寸、图层数)
    - 图层树结构
    - 缩略图 (如果有)
    """
    try:
        from psd_tools import PSDImage
        
        # 打开PSD文件
        psd = PSDImage.open(io.BytesIO(psd_data))
        
        # 构建图层树
        layers = build_layer_tree(psd)
        
        # 生成缩略图
        thumbnail = None
        try:
            thumbnail_buffer = io.BytesIO()
            # 缩放图片以便显示
            size = (min(psd.width, 800), min(psd.height, 600))
            # psd.topil() 可能不可用，尝试其他方式
            # 这里简化处理，返回一个空白缩略图
            img = Image.new('RGB', (psd.width, psd.height), (200, 200, 200))
            img.thumbnail(size, Image.Resampling.LANCZOS)
            img.save(thumbnail_buffer, 'PNG')
            thumbnail = 'data:image/png;base64,' + base64.b64encode(thumbnail_buffer.getvalue()).decode('utf-8')
        except Exception as e:
            print(f"缩略图生成失败: {str(e)}")
        
        result = {
            'width': psd.width,
            'height': psd.height,
            'layerCount': count_layers(psd),
            'layers': layers,
            'thumbnail': thumbnail
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(result),
            'headers': {'Content-Type': 'application/json'}
        }
        
    except ImportError:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'psd-tools库未安装，请联系管理员'}),
            'headers': {'Content-Type': 'application/json'}
        }
    except Exception as e:
        print(f"PSD解析错误: {str(e)}")
        traceback.print_exc()
        raise


def build_layer_tree(psd, include_hidden=True):
    """
    递归构建图层树
    
    参数:
    - psd: PSDImage对象
    - include_hidden: 是否包含隐藏图层
    
    返回:
    - 图层树列表
    """
    layers = []
    
    for layer in psd:
        # 检查是否跳过隐藏图层
        if not include_hidden and not layer.visible:
            continue
        
        layer_info = {
            'id': str(id(layer)),
            'name': layer.name,
            'visible': layer.visible,
            'opacity': layer.opacity,
            'left': layer.left,
            'top': layer.top,
            'right': layer.right,
            'bottom': layer.bottom,
            'width': layer.width,
            'height': layer.height,
        }
        
        # 判断图层类型
        if hasattr(layer, 'is_group') and layer.is_group():
            layer_info['type'] = 'group'
            layer_info['children'] = build_layer_tree(layer, include_hidden)
        elif hasattr(layer, 'is_smart_object') and layer.is_smart_object():
            layer_info['type'] = 'smart_object'
        elif hasattr(layer, 'is_vector_mask') and layer.is_vector_mask():
            layer_info['type'] = 'shape'
        elif hasattr(layer, 'is_pixels') and layer.is_pixels():
            layer_info['type'] = 'image'
        elif layer.kind == 'text':
            layer_info['type'] = 'text'
        elif layer.kind == 'shape':
            layer_info['type'] = 'shape'
        else:
            layer_info['type'] = layer.kind or 'unknown'
        
        layers.append(layer_info)
    
    return layers


def count_layers(psd):
    """统计图层总数"""
    count = 0
    for layer in psd:
        count += 1
        if hasattr(layer, 'is_group') and layer.is_group():
            count += count_layers(layer)
    return count


def cut_psd(file_name, psd_data, selected_layers, settings):
    """
    切图处理
    
    参数:
    - file_name: 文件名
    - psd_data: PSD文件数据
    - selected_layers: 选中的图层ID列表
    - settings: 切图设置
    
    返回:
    - ZIP压缩包 (Base64编码)
    """
    try:
        from psd_tools import PSDImage
        
        # 打开PSD文件
        psd = PSDImage.open(io.BytesIO(psd_data))
        
        # 解析设置
        output_format = settings.get('format', 'png')
        jpg_quality = settings.get('jpgQuality', 0.9)
        auto_crop = settings.get('autoCrop', True)
        use_prefix = settings.get('usePrefix', True)
        group_subdir = settings.get('groupSubdir', True)
        min_size_filter = settings.get('minSizeFilter', False)
        padding = settings.get('padding', 0)
        
        # 收集需要导出的图层
        layers_to_export = []
        
        def collect_layers(psd_layers, parent_path=''):
            for layer in psd_layers:
                layer_id = str(id(layer))
                
                # 检查是否选中
                if layer_id in selected_layers:
                    # 过滤小尺寸
                    if min_size_filter and (layer.width < 10 or layer.height < 10):
                        continue
                    
                    # 确定输出路径
                    output_path = parent_path
                    if group_subdir and hasattr(layer, 'parent') and layer.parent and layer.parent.kind:
                        # 按父组创建目录
                        parent_name = sanitize_filename(layer.parent.name)
                        if parent_name and parent_name not in output_path:
                            output_path = os.path.join(output_path, parent_name)
                    
                    layers_to_export.append({
                        'layer': layer,
                        'path': output_path,
                        'name': sanitize_filename(layer.name)
                    })
                
                # 递归处理子图层
                if hasattr(layer, 'is_group') and layer.is_group():
                    new_path = parent_path
                    if group_subdir:
                        new_path = os.path.join(parent_path, sanitize_filename(layer.name))
                    collect_layers(layer, new_path)
        
        collect_layers(psd)
        
        # 创建ZIP文件
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for item in layers_to_export:
                layer = item['layer']
                path = item['path']
                name = item['name']
                
                try:
                    # 导出图层
                    layer_image = layer.composite()
                    
                    if layer_image is None:
                        continue
                    
                    # 转换为RGBA
                    if layer_image.mode != 'RGBA':
                        layer_image = layer_image.convert('RGBA')
                    
                    # 自动裁剪
                    if auto_crop:
                        bbox = layer_image.getbbox()
                        if bbox:
                            left, top, right, bottom = bbox
                            # 添加内边距
                            left = max(0, left - padding)
                            top = max(0, top - padding)
                            right = min(layer_image.width, right + padding)
                            bottom = min(layer_image.height, bottom + padding)
                            layer_image = layer_image.crop((left, top, right, bottom))
                    
                    # 保存图片
                    img_buffer = io.BytesIO()
                    
                    if output_format == 'jpg':
                        # 转换为RGB (JPG不支持透明)
                        rgb_image = Image.new('RGB', layer_image.size, (255, 255, 255))
                        rgb_image.paste(layer_image, mask=layer_image.split()[3])
                        rgb_image.save(img_buffer, 'JPEG', quality=int(jpg_quality * 100))
                        ext = 'jpg'
                    else:
                        layer_image.save(img_buffer, 'PNG')
                        ext = 'png'
                    
                    # 确定文件名
                    prefix = ''
                    if use_prefix:
                        # 根据图层类型添加前缀
                        if layer.kind == 'text':
                            prefix = 'txt_'
                        elif layer.kind == 'shape':
                            prefix = 'shp_'
                    
                    file_name = f"{prefix}{name}.{ext}"
                    
                    # 完整路径
                    if path:
                        full_path = f"{path}/{file_name}"
                    else:
                        full_path = file_name
                    
                    # 添加到ZIP
                    zip_file.writestr(full_path, img_buffer.getvalue())
                    
                except Exception as e:
                    print(f"导出图层失败 {layer.name}: {str(e)}")
                    continue
        
        # 返回ZIP文件
        zip_buffer.seek(0)
        zip_data = zip_buffer.getvalue()
        
        return {
            'statusCode': 200,
            'body': base64.b64encode(zip_data).decode('utf-8'),
            'headers': {
                'Content-Type': 'application/zip',
                'Content-Transfer-Encoding': 'base64'
            },
            'isBase64Encoded': True
        }
        
    except ImportError:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'psd-tools库未安装，请联系管理员'}),
            'headers': {'Content-Type': 'application/json'}
        }
    except Exception as e:
        print(f"切图错误: {str(e)}")
        traceback.print_exc()
        raise


def sanitize_filename(name):
    """
    清理文件名，移除无效字符
    """
    if not name:
        return 'unnamed'
    
    # 替换无效字符
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        name = name.replace(char, '_')
    
    # 移除前后空格和点
    name = name.strip(' .')
    
    # 限制长度
    if len(name) > 50:
        name = name[:50]
    
    return name or 'unnamed'


# Vercel Serverless Function 入口
def main(request):
    """Vercel 入口函数"""
    return handler(request)


# 本地测试
if __name__ == '__main__':
    print("请使用 Vercel CLI 部署此函数")
    print("本地测试需要安装: pip install psd-tools Pillow")
