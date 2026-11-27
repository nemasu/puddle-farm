use axum::body::Bytes;

fn process_channel(value: u8) -> u8 {
    if value != 0 && value != 255 {
        let n = f64::sqrt(value as f64 / 255.0);
        (n * 255.0) as u8
    } else {
        value
    }
}

pub fn handle_get_avatar(png: &str) -> Result<Bytes, String> {
    // Decode base64
    let png_bytes =
        base64_url::decode(png).map_err(|error| format!("avatar is not valid base64: {error}"))?;

    // Load image from bytes
    let img = image::load_from_memory(&png_bytes)
        .map_err(|error| format!("avatar is not a supported image: {error}"))?;

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
    rgba.write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|error| format!("avatar could not be encoded as PNG: {error}"))?;

    Ok(Bytes::from(output))
}

#[cfg(test)]
mod tests {
    use super::handle_get_avatar;

    #[test]
    fn rejects_invalid_base64_without_panicking() {
        assert!(handle_get_avatar("not base64!").is_err());
    }

    #[test]
    fn rejects_non_image_data_without_panicking() {
        let encoded = base64_url::encode(b"not an image");
        assert!(handle_get_avatar(&encoded).is_err());
    }

    #[test]
    fn converts_a_valid_image_to_png() {
        let image = image::DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(
            1,
            1,
            image::Rgba([255, 255, 255, 0]),
        ));
        let mut source = Vec::new();
        image
            .write_to(
                &mut std::io::Cursor::new(&mut source),
                image::ImageFormat::Png,
            )
            .unwrap();

        let output = handle_get_avatar(&base64_url::encode(&source)).unwrap();
        assert!(image::load_from_memory(&output).is_ok());
    }
}
