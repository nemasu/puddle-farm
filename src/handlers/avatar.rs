use axum::body::Bytes;

pub async fn handle_get_avatar(png: String) -> Bytes {
    // Decode base64
    let png_bytes = base64_url::decode(&png).unwrap();

    // Load image from bytes
    let img = image::load_from_memory(&png_bytes).unwrap();

    // Convert to RGBA
    let mut rgba = img.to_rgba8();

    // Invert alpha channel
    for pixel in rgba.pixels_mut() {
        pixel[3] = 255 - pixel[3];
    }

    // Convert back to PNG bytes
    let mut output = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut output);
    rgba.write_to(&mut cursor, image::ImageFormat::Png).unwrap();

    Bytes::from(output)
}
