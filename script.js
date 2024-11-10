document.getElementById("convertButton").addEventListener("click", function () {
    const inputFile = document.getElementById("inputFile").files[0];
    const formatSelect = document.getElementById("formatSelect").value;
    const selectedScale = document.querySelector(".scale-option.active")?.getAttribute("data-scale");

    // Use the active button's scale if present; otherwise, use the scale input values
    const scale = selectedScale ? parseFloat(selectedScale) : 1;

    // Get custom width and height values
    const customWidth = document.getElementById("customWidth").value;
    const customHeight = document.getElementById("customHeight").value;

    // Ensure scale buttons are deactivated if custom width/height is used
    if (customWidth || customHeight) {
        document.querySelectorAll(".scale-option").forEach(button => button.classList.remove("active"));
    }

    // Check if custom width/height is provided only if no scale is selected
    if (!selectedScale && !customWidth && !customHeight) {
        alert("Please enter at least one dimension (width or height) if no scale is selected.");
        return;
    }

    let finalWidth = customWidth ? parseInt(customWidth) : undefined;
    let finalHeight = customHeight ? parseInt(customHeight) : undefined;

    // Calculate the missing dimension based on the aspect ratio
    if (finalWidth && !finalHeight) {
        const aspectRatio = inputFile.width / inputFile.height; // Or get from image when loaded
        finalHeight = Math.round(finalWidth / aspectRatio);
    } else if (!finalWidth && finalHeight) {
        const aspectRatio = inputFile.width / inputFile.height; // Or get from image when loaded
        finalWidth = Math.round(finalHeight * aspectRatio);
    }

    if (!inputFile) {
        alert("Please select an image file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const fileType = inputFile.type;
        const img = new Image();
        img.src = e.target.result;

        img.onload = function () {
            // Handle SVG to SVG conversion (scaling)
            if (formatSelect === 'svg' && fileType === 'image/svg+xml') {
                const svgData = e.target.result;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(svgData, "image/svg+xml");

                const svgElement = xmlDoc.querySelector("svg");

                // Scale the SVG element by adjusting width and height
                if (finalWidth) svgElement.setAttribute('width', finalWidth);
                if (finalHeight) svgElement.setAttribute('height', finalHeight);

                // If no custom width/height is provided, apply the scale factor
                if (!finalWidth && !finalHeight) {
                    const originalWidth = svgElement.getAttribute('width');
                    const originalHeight = svgElement.getAttribute('height');

                    svgElement.setAttribute('width', originalWidth * scale);
                    svgElement.setAttribute('height', originalHeight * scale);
                }

                // If viewBox exists, adjust the viewBox to reflect new width/height
                const viewBox = svgElement.getAttribute('viewBox');
                if (viewBox) {
                    const [minX, minY, originalWidth, originalHeight] = viewBox.split(' ').map(Number);
                    svgElement.setAttribute('viewBox', `${minX} ${minY} ${finalWidth || originalWidth} ${finalHeight || originalHeight}`);
                }

                const svgOutput = new XMLSerializer().serializeToString(xmlDoc);
                downloadImage("data:image/svg+xml;base64," + btoa(svgOutput), `converted_image.${formatSelect}`);
            }

            // Handle raster image to SVG conversion (no actual conversion, just wrapping)
            else if (formatSelect === 'svg' && fileType !== 'image/svg+xml') {
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${finalWidth || img.width}" height="${finalHeight || img.height}">
                                <image href="${e.target.result}" width="${finalWidth || img.width}" height="${finalHeight || img.height}" />
                            </svg>`;
                downloadImage("data:image/svg+xml;base64," + btoa(svg), `converted_image.${formatSelect}`);
            }

            // Handle raster image to WebP or WebP to raster conversion
            else if (formatSelect === 'webp') {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // If custom width and height are provided, apply them
                canvas.width = finalWidth || img.width;
                canvas.height = finalHeight || img.height;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Convert to WebP if it's a raster image
                if (fileType !== 'image/webp') {
                    const convertedDataUrl = canvas.toDataURL("image/webp");
                    downloadImage(convertedDataUrl, `converted_image.${formatSelect}`);
                } else {
                    // WebP to PNG or JPEG
                    const outputFormat = formatSelect === 'jpeg' ? 'image/jpeg' : 'image/png';
                    const convertedDataUrl = canvas.toDataURL(outputFormat);
                    downloadImage(convertedDataUrl, `converted_image.${formatSelect}`);
                }
            }

            // Handle raster to raster conversion (PNG/JPEG)
            else {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // Apply the custom width and height if available
                canvas.width = finalWidth || img.width;
                canvas.height = finalHeight || img.height;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const outputFormat = formatSelect === 'jpeg' ? 'image/jpeg' : 'image/png';
                const convertedDataUrl = canvas.toDataURL(outputFormat);
                downloadImage(convertedDataUrl, `converted_image.${formatSelect}`);
            }
        };
    };
    reader.readAsDataURL(inputFile);
});

function downloadImage(dataUrl, filename) {
    const downloadLink = document.createElement("a");
    downloadLink.href = dataUrl;
    downloadLink.download = filename;
    downloadLink.click();
}

// Handle scale selection toggle
document.querySelectorAll(".scale-option").forEach(button => {
    button.addEventListener("click", function () {
        // Remove active class from all buttons, then add to clicked button
        document.querySelectorAll(".scale-option").forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");

        // Optionally, update the custom input fields with the selected scale (if desired)
        const scaleValue = this.getAttribute("data-scale");
        document.getElementById("customWidth").value = ""; // Clear any custom width
        document.getElementById("customHeight").value = ""; // Clear any custom height
    });
});

// Remove scale highlight when typing in custom width or height
document.getElementById("customWidth").addEventListener("input", function () {
    document.querySelectorAll(".scale-option").forEach(button => button.classList.remove("active"));
});
document.getElementById("customHeight").addEventListener("input", function () {
    document.querySelectorAll(".scale-option").forEach(button => button.classList.remove("active"));
});
