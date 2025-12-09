let canvasImage = new Image();
let imageLoaded = false;

window.initializeCanvas = function(canvas) {
    const ctx = canvas.getContext('2d');
    
    // Draw placeholder initially
    drawPlaceholder(canvas, ctx, 'Click "Load Image" to display an image');
};

window.loadImageByPath = function(canvas, imagePath) {
    const ctx = canvas.getContext('2d');
    
    // Reset the image
    canvasImage = new Image();
    imageLoaded = false;
    
    // Ensure path starts with /
    if (!imagePath.startsWith('/')) {
        imagePath = '/' + imagePath;
    }
    
    canvasImage.src = imagePath;
    
    canvasImage.onload = function() {
        imageLoaded = true;
        
        // Adjust canvas size to match image aspect ratio
        const maxWidth = 800;
        const maxHeight = 600;
        const imgWidth = canvasImage.width;
        const imgHeight = canvasImage.height;
        const imgAspectRatio = imgWidth / imgHeight;
        
        let newWidth, newHeight;
        
        // Fit image within max dimensions while preserving aspect ratio
        if (imgWidth > imgHeight) {
            newWidth = Math.min(imgWidth, maxWidth);
            newHeight = newWidth / imgAspectRatio;
            
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = newHeight * imgAspectRatio;
            }
        } else {
            newHeight = Math.min(imgHeight, maxHeight);
            newWidth = newHeight * imgAspectRatio;
            
            if (newWidth > maxWidth) {
                newWidth = maxWidth;
                newHeight = newWidth / imgAspectRatio;
            }
        }
        
        // Update canvas dimensions
        canvas.width = Math.round(newWidth);
        canvas.height = Math.round(newHeight);
        
        // Draw the image to fit canvas
        ctx.drawImage(canvasImage, 0, 0, canvas.width, canvas.height);
    };
    
    canvasImage.onerror = function() {
        imageLoaded = false;
        drawPlaceholder(canvas, ctx, 'Failed to load image: ' + imagePath);
    };
};

function drawPlaceholder(canvas, ctx, message) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

window.getCanvasBoundingRect = function(canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
        left: rect.left,
        top: rect.top
    };
};

window.redrawCanvas = function(canvas, rectangles, currentRectangle) {
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw the image or placeholder
    if (imageLoaded) {
        ctx.drawImage(canvasImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Place your image at wwwroot/sample-image.jpg', canvas.width / 2, canvas.height / 2);
    }
    
    // Draw all completed rectangles
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    
    if (rectangles && rectangles.length > 0) {
        rectangles.forEach(rect => {
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        });
    }
    
    // Draw current rectangle being drawn
    if (currentRectangle) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.strokeRect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
        ctx.fillRect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
    }
};
