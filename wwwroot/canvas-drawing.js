let canvasImage = new Image();
let imageLoaded = false;
let zoomLevel = 1.0;
let panOffset = { x: 0, y: 0 };
let isPanning = false;
let lastPanPoint = { x: 0, y: 0 };
let baseCanvasWidth = 800;
let baseCanvasHeight = 600;

window.initializeCanvas = function(canvas) {
    const ctx = canvas.getContext('2d');
    
    // Draw placeholder initially
    drawPlaceholder(canvas, ctx, 'Click "Load Image" to display an image');
    
    // Add wheel event listener for zoom
    canvas.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        if (!imageLoaded) return;
        
        // Update zoom level
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        zoomLevel = Math.max(0.1, Math.min(10, zoomLevel * zoomDelta));
        
        // Trigger redraw with new zoom
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
        
        // Get available space for canvas (85% of viewport width minus padding and sidebar)
        const viewportWidth = window.innerWidth;
        
        // Calculate available width: 85% of viewport minus sidebar and padding
        // Sidebar is ~15% (min 250px), so canvas area gets remaining space
        const sidebarWidth = Math.max(viewportWidth * 0.15, 250);
        const availableWidth = viewportWidth - sidebarWidth - 60; // 60px for padding
        
        const imgWidth = canvasImage.width;
        const imgHeight = canvasImage.height;
        const imgAspectRatio = imgWidth / imgHeight;
        
        // Scale based on width - prioritize showing full width
        // Height will be proportional, allowing vertical scrolling if needed
        baseCanvasWidth = Math.min(imgWidth, availableWidth);
        baseCanvasHeight = baseCanvasWidth / imgAspectRatio;
        
        // Set initial canvas size (will be adjusted by zoom)
        updateCanvasSize(canvas);
        
        // Draw the image
        window.redrawCanvas(canvas, [], null);
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
    // Convert from screen coordinates to base (unzoomed) canvas coordinates
    // This ensures rectangles are stored in base coordinates
    const x = ((clientX - rect.left) / rect.width) * baseCanvasWidth;
    const y = ((clientY - rect.top) / rect.height) * baseCanvasHeight;
    return { x: x, y: y };
};

function updateCanvasSize(canvas) {
    // Update canvas display size based on zoom level
    const displayWidth = Math.round(baseCanvasWidth * zoomLevel);
    const displayHeight = Math.round(baseCanvasHeight * zoomLevel);
    
    // Set canvas element size (what gets displayed)
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    // Set canvas internal resolution (for drawing)
    canvas.width = displayWidth;
    canvas.height = displayHeight;
}

window.zoomIn = function(canvas) {
    if (!imageLoaded) return;
    
    zoomLevel = Math.min(10, zoomLevel * 1.2);
    
    window.redrawCanvas(canvas, window.currentRectangles || [], window.currentDrawingRect || null);
};

window.zoomOut = function(canvas) {
    if (!imageLoaded) return;
    
    zoomLevel = Math.max(0.1, zoomLevel / 1.2);
    
    window.redrawCanvas(canvas, window.currentRectangles || [], window.currentDrawingRect || null);
};

window.resetZoom = function(canvas) {
    if (!imageLoaded) return;
    
    zoomLevel = 1.0;
    
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
    
    // Update canvas size based on zoom
    updateCanvasSize(canvas);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw the image or placeholder
    if (imageLoaded) {
        // Draw image scaled to fill the zoomed canvas
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
    
    // Draw all completed rectangles (scaled to match zoom)
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    
    if (rectangles && rectangles.length > 0) {
        rectangles.forEach(rect => {
            // Scale rectangle coordinates to match zoom
            const scaledX = rect.x * zoomLevel;
            const scaledY = rect.y * zoomLevel;
            const scaledWidth = rect.width * zoomLevel;
            const scaledHeight = rect.height * zoomLevel;
            
            ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
            ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
        });
    }
    
    // Draw current rectangle being drawn
    if (currentRectangle) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        
        // Scale rectangle coordinates to match zoom
        const scaledX = currentRectangle.x * zoomLevel;
        const scaledY = currentRectangle.y * zoomLevel;
        const scaledWidth = currentRectangle.width * zoomLevel;
        const scaledHeight = currentRectangle.height * zoomLevel;
        
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
        ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
    }
};
