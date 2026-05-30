from PIL import Image
import os
import uuid
from datetime import datetime

AVATAR_SIZE = (200, 200)
AVATAR_QUALITY = 85

def ensure_avatar_dir(username):
    """确保用户头像目录存在"""
    avatar_dir = os.path.join('storage', username, 'avatar')
    if not os.path.exists(avatar_dir):
        os.makedirs(avatar_dir, exist_ok=True)
    return avatar_dir

def crop_to_square(image):
    """将图片裁剪为正方形（取中心区域）"""
    width, height = image.size
    min_dim = min(width, height)
    
    left = (width - min_dim) / 2
    top = (height - min_dim) / 2
    right = (width + min_dim) / 2
    bottom = (height + min_dim) / 2
    
    return image.crop((left, top, right, bottom))

def resize_image(image, size):
    """调整图片大小"""
    return image.resize(size, Image.Resampling.LANCZOS)

def save_as_webp(image, filepath, quality=85):
    """保存为webp格式"""
    image.save(filepath, 'WEBP', quality=quality)

def process_avatar(image_file, username):
    """
    处理头像图片：裁剪、缩放、压缩为webp
    
    Args:
        image_file: 上传的图片文件
        username: 用户名
    
    Returns:
        str: 保存后的文件路径
    """
    try:
        img = Image.open(image_file)
        
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        img_square = crop_to_square(img)
        
        img_resized = resize_image(img_square, AVATAR_SIZE)
        
        avatar_dir = ensure_avatar_dir(username)
        
        filename = f"{uuid.uuid4().hex}.webp"
        filepath = os.path.join(avatar_dir, filename)
        
        save_as_webp(img_resized, filepath, AVATAR_QUALITY)
        
        relative_path = os.path.join('storage', username, 'avatar', filename)
        relative_path = relative_path.replace('\\', '/')
        
        return relative_path
        
    except Exception as e:
        raise Exception(f"头像处理失败: {str(e)}")

def delete_old_avatar(username, current_avatar_path):
    """删除旧的头像文件"""
    if not current_avatar_path:
        return
    
    try:
        full_path = current_avatar_path
        if not os.path.isabs(full_path):
            full_path = os.path.join(os.getcwd(), current_avatar_path)
        
        if os.path.exists(full_path):
            os.remove(full_path)
    except Exception:
        pass

def get_avatar_url(username):
    """获取用户最新的头像URL"""
    avatar_dir = os.path.join('storage', username, 'avatar')
    
    if not os.path.exists(avatar_dir):
        return None
    
    files = [f for f in os.listdir(avatar_dir) if f.endswith('.webp')]
    
    if not files:
        return None
    
    files.sort(key=lambda x: os.path.getmtime(os.path.join(avatar_dir, x)), reverse=True)
    
    latest_file = files[0]
    return os.path.join('storage', username, 'avatar', latest_file).replace('\\', '/')