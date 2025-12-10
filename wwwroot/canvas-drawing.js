let canvasImage = new Image();
let imageLoaded = false;
let zoomLevel = 1.0;
let panOffset = { x: 0, y: 0 };
let isPanning = false;
let lastPanPoint = { x: 0, y: 0 };
let canvasBaseSize = { width: 800, height: 600 };

window.initializeCanvas = function(canvas) {
    const ctx = canvas.getContext('2d');
    
    // Draw placeholder initially
    drawPlaceholder(canvas, ctx, 'Click "Load Image" to display an image');
    
    // Add wheel event listener for zoom
    canvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        if (!imageLoaded) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Convert mouse position to image coordinates before zoom
        const imageX = (mouseX - panOffset.x) / zoomLevel;
        const imageY = (mouseY - panOffset.y) / zoomLevel;
        
        // Update zoom level
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(10, zoomLevel * zoomDelta));
        
        // Adjust pan to keep mouse position fixed
        panOffset.x = mouseX - imageX * newZoom;
        panOffset.y = mouseY - imageY * newZoom;
        
        zoomLevel = newZoom;
        
        // Trigger redraw
        window.redrawCanvas(canvas, window.currentRectangles || [], window.currentDrawingRect || null);
    });
};

window.loadImageByPath = function(canvas, imagePath) {
    const ctx = canvas.getContext('2d');
    
    // Reset the image and transform
    canvasImage = new Image();
    imageLoaded = false;
    zoomLevel = 1.0;
    panOffset = { x: 0, y: 0 };
    
    // Ensure path starts with /
    if (!imagePath.startsWith('/')) {
        imagePath = '/' + imagePath;
    }
    
    canvasImage.src = imagePath;
    
    canvasImage.onload = function() {
        imageLoaded = true;
        
        // Get available space for canvas (85% of viewport width minus padding)
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate max dimensions based on new layout
        // 85% for canvas area, but leave some margin
        const maxWidth = Math.min(viewportWidth * 0.80, 1400);
        const maxHeight = viewportHeight - 120; // Account for header and padding
        
        const imgWidth = canvasImage.width;
        const imgHeight = canvasImage.height;
        const imgAspectRatio = imgWidth / imgHeight;
        
        let newWidth, newHeight;
        
        // Fit image within max dimensions while preserving aspect ratio
        // Prioritize height for portrait documents
        if (imgHeight > imgWidth) {
            // Portrait orientation - prioritize height
            newHeight = Math.min(imgHeight, maxHeight);
            newWidth = newHeight * imgAspectRatio;
            
            if (newWidth > maxWidth) {
                newWidth = maxWidth;
                newHeight = newWidth / imgAspectRatio;
            }
        } else {
            // Landscape orientation - prioritize width
            newWidth = Math.min(imgWidth, maxWidth);
            newHeight = newWidth / imgAspectRatio;
            
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = newHeight * imgAspectRatio;
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

window.screenToCanvasCoordinates = function(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - panOffset.x) / zoomLevel;
    const y = (clientY - rect.top - panOffset.y) / zoomLevel;
    return { x: x, y: y };
};

window.zoomIn = function(canvas) {
    if (!imageLoaded) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const imageX = (centerX - panOffset.x) / zoomLevel;
    const imageY = (centerY - panOffset.y) / zoomLevel;
    
    zoomLevel = Math.min(10, zoomLevel * 1.2);
    
    panOffset.x = centerX - imageX * zoomLevel;
    panOffset.y = centerY - imageY * zoomLevel;
    
    window.redrawCanvas(canvas, window.currentRectangles || [], window.currentDrawingRect || null);
};

window.zoomOut = function(canvas) {
    if (!imageLoaded) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const imageX = (centerX - panOffset.x) / zoomLevel;
    const imageY = (centerY - panOffset.y) / zoomLevel;
    
    zoomLevel = Math.max(0.1, zoomLevel / 1.2);
    
    panOffset.x = centerX - imageX * zoomLevel;
    panOffset.y = centerY - imageY * zoomLevel;
    
    window.redrawCanvas(canvas, window.currentRectangles || [], window.currentDrawingRect || null);
};

window.resetZoom = function(canvas) {
    if (!imageLoaded) return;
    
    zoomLevel = 1.0;
    panOffset = { x: 0, y: 0 };
    
    window.redrawCanvas(canvas, window.currentRectangles || [], window.currentDrawingRect || null);
};

window.getZoomLevel = function() {
    return zoomLevel;
};

window.startPan = function(clientX, clientY) {
    isPanning = true;
    lastPanPoint = { x: clientX, y: clientY };
};

window.updatePan = function(canvas, clientX, clientY) {
    if (!isPanning || !imageLoaded) return false;
    
    const dx = clientX - lastPanPoint.x;
    const dy = clientY - lastPanPoint.y;
    
    panOffset.x += dx;
    panOffset.y += dy;
    
    lastPanPoint = { x: clientX, y: clientY };
    
    window.redrawCanvas(canvas, window.currentRectangles || [], window.currentDrawingRect || null);
    return true;
};

window.endPan = function() {
    isPanning = false;
};

window.redrawCanvas = function(canvas, rectangles, currentRectangle) {
    const ctx = canvas.getContext('2d');
    
    // Store for wheel event access
    window.currentRectangles = rectangles;
    window.currentDrawingRect = currentRectangle;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context state
    ctx.save();
    
    // Apply transformations for zoom and pan
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);
    
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
    ctx.lineWidth = 2 / zoomLevel; // Adjust line width for zoom
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
        ctx.lineWidth = 2 / zoomLevel; // Adjust line width for zoom
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.strokeRect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
        ctx.fillRect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
    }
    
    // Restore context state
    ctx.restore();
};
