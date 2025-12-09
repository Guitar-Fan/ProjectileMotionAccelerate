from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math
import os

OUTPUT_DIR = "public/assets/sprites"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_base_image(size=(256, 256)):
    return Image.new("RGBA", size, (0, 0, 0, 0))

def save_image(img, name):
    path = os.path.join(OUTPUT_DIR, name)
    img.save(path, "PNG")
    print(f"Saved {path}")

def draw_gradient_circle(draw, center, radius, color1, color2):
    # Simple radial gradient simulation by drawing concentric circles
    x, y = center
    for r in range(radius, 0, -1):
        ratio = r / radius
        # Interpolate color
        r_val = int(color1[0] * ratio + color2[0] * (1 - ratio))
        g_val = int(color1[1] * ratio + color2[1] * (1 - ratio))
        b_val = int(color1[2] * ratio + color2[2] * (1 - ratio))
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(r_val, g_val, b_val))

def generate_cannon():
    img = create_base_image()
    draw = ImageDraw.Draw(img)
    
    # Barrel
    draw.rectangle((80, 100, 176, 220), fill=(40, 40, 50))
    draw.rectangle((90, 100, 166, 220), fill=(60, 60, 70))
    
    # Energy Core
    draw_gradient_circle(draw, (128, 100), 50, (100, 200, 255), (0, 50, 100))
    
    # Glow
    glow = img.filter(ImageFilter.GaussianBlur(10))
    img = Image.alpha_composite(glow, img)
    
    save_image(img, "cannon.png")

def generate_kick():
    img = create_base_image()
    draw = ImageDraw.Draw(img)
    
    # Soccer ball base
    draw.ellipse((28, 28, 228, 228), fill=(240, 240, 240), outline=(200, 200, 200), width=2)
    
    # Pentagons (simplified)
    patches = [
        (128, 128), (80, 80), (176, 80), (80, 176), (176, 176)
    ]
    for px, py in patches:
        draw.regular_polygon((px, py, 25), 5, rotation=0, fill=(20, 20, 20))
        
    # Motion blur lines
    draw.line((10, 128, 50, 128), fill=(200, 200, 200, 100), width=10)
    
    save_image(img, "kick.png")

def generate_bat():
    img = create_base_image()
    draw = ImageDraw.Draw(img)
    
    # Bat shape (diagonal)
    # Handle
    draw.line((60, 200, 100, 160), fill=(180, 140, 100), width=20)
    # Barrel
    draw.line((100, 160, 200, 60), fill=(210, 180, 140), width=35)
    
    # Wood grain
    draw.line((110, 150, 190, 70), fill=(190, 160, 120), width=2)
    
    # Impact star
    draw.regular_polygon((200, 60, 40), 8, rotation=22, fill=(255, 255, 200, 180))
    
    save_image(img, "bat.png")

def generate_throw():
    img = create_base_image()
    draw = ImageDraw.Draw(img)
    
    # Hand/Arm shape (abstract)
    draw.polygon([(50, 200), (100, 150), (150, 150), (100, 250)], fill=(200, 150, 100))
    
    # Ball
    draw.ellipse((140, 100, 200, 160), fill=(255, 50, 50))
    
    # Speed lines
    for i in range(3):
        y = 110 + i * 20
        draw.line((210, y, 250, y), fill=(255, 255, 255, 150), width=5)

    save_image(img, "throw.png")

def generate_rail():
    img = create_base_image()
    draw = ImageDraw.Draw(img)
    
    # Rails
    draw.rectangle((50, 100, 206, 120), fill=(100, 100, 120)) # Top rail
    draw.rectangle((50, 180, 206, 200), fill=(100, 100, 120)) # Bottom rail
    
    # Projectile
    draw.rectangle((100, 130, 150, 170), fill=(50, 200, 255))
    
    # Electric arcs
    draw.line((125, 120, 125, 130), fill=(100, 255, 255), width=2)
    draw.line((125, 170, 125, 180), fill=(100, 255, 255), width=2)
    
    # Glow
    glow = img.filter(ImageFilter.GaussianBlur(5))
    img = Image.alpha_composite(glow, img)

    save_image(img, "rail.png")

if __name__ == "__main__":
    generate_cannon()
    generate_kick()
    generate_bat()
    generate_throw()
    generate_rail()
