use axum::body::Bytes;

fn process_channel(value: u8) -> u8 {
    if value != 0 && value != 255 {
        let n = f64::sqrt(value as f64 / 256.0);
        (n * 256.0) as u8
    } else {
        value
    }
}

pub async fn handle_get_avatar(png: String) -> Bytes {
    // Decode base64
    let png_bytes = base64_url::decode(&png).unwrap();

    // Load image from bytes
    let img = image::load_from_memory(&png_bytes).unwrap();

    // Convert to RGBA
    let mut rgba = img.to_rgba8();

    // Process image
    for pixel in rgba.pixels_mut() {
        pixel[0] = process_channel(pixel[0]);
        pixel[1] = process_channel(pixel[1]);
        pixel[2] = process_channel(pixel[2]);
        pixel[3] = 255 - pixel[3];
    }

    // Convert back to PNG bytes
    let mut output = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut output);
    rgba.write_to(&mut cursor, image::ImageFormat::Png).unwrap();

    Bytes::from(output)
}
