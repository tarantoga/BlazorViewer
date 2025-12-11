// ============================================================================
// State Management
// ============================================================================
const state = {
    image: new Image(),
    isImageLoaded: false,
    zoomLevel: 1.0,
    isPanning: false,
    lastPanPoint: { x: 0, y: 0 },
    baseCanvasSize: { width: 800, height: 600 },
    currentRectangles: [],
    currentDrawingRect: null
};

// ============================================================================
// Canvas Initialization
// ============================================================================
window.initializeCanvas = function(canvas) {
    const ctx = canvas.getContext('2d');
    drawPlaceholder(canvas, ctx, 'Click "Load Image" to display an image');
    setupZoomListener(canvas);
};

function setupZoomListener(canvas) {
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (!state.isImageLoaded) return;
        
        // Get scroll container
        const scrollContainer = canvas.closest('.canvas-area');
        if (!scrollContainer) return;
        
        // Get mouse position relative to the viewport
        const rect = scrollContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Get current scroll position
        const scrollX = scrollContainer.scrollLeft;
        const scrollY = scrollContainer.scrollTop;
        
        // Calculate mouse position in the scrolled content
        const contentX = mouseX + scrollX;
        const contentY = mouseY + scrollY;
        
        // Apply zoom
        const oldZoom = state.zoomLevel;
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        state.zoomLevel = Math.max(0.1, Math.min(10, state.zoomLevel * zoomDelta));
        
        // Render with new zoom
        renderCanvas(canvas);
        
        // Calculate new scroll position to keep the point under the cursor
        const zoomRatio = state.zoomLevel / oldZoom;
        const newScrollX = contentX * zoomRatio - mouseX;
        const newScrollY = contentY * zoomRatio - mouseY;
        
        // Apply new scroll position
        scrollContainer.scrollLeft = newScrollX;
        scrollContainer.scrollTop = newScrollY;
    });
}

// ============================================================================
// Image Loading
// ============================================================================
window.loadImageByPath = function(canvas, imagePath) {
    resetState();
    
    // Ensure path starts with /
    const path = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
    
    state.image.src = path;
    state.image.onload = () => handleImageLoad(canvas);
    state.image.onerror = () => handleImageError(canvas, path);
};

function resetState() {
    state.image = new Image();
    state.isImageLoaded = false;
    state.zoomLevel = 1.0;
}

function handleImageLoad(canvas) {
    state.isImageLoaded = true;
    calculateBaseCanvasSize();
    updateCanvasSize(canvas);
    renderCanvas(canvas);
}

function handleImageError(canvas, imagePath) {
    state.isImageLoaded = false;
    const ctx = canvas.getContext('2d');
    drawPlaceholder(canvas, ctx, `Failed to load image: ${imagePath}`);
}

function calculateBaseCanvasSize() {
    const viewportWidth = window.innerWidth;
    const sidebarWidth = Math.max(viewportWidth * 0.15, 250);
    const availableWidth = viewportWidth - sidebarWidth - 60;
    
    const imgAspectRatio = state.image.width / state.image.height;
    state.baseCanvasSize.width = Math.min(state.image.width, availableWidth);
    state.baseCanvasSize.height = state.baseCanvasSize.width / imgAspectRatio;
}

// ============================================================================
// Canvas Drawing
// ============================================================================
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

function updateCanvasSize(canvas) {
    const displayWidth = Math.round(state.baseCanvasSize.width * state.zoomLevel);
    const displayHeight = Math.round(state.baseCanvasSize.height * state.zoomLevel);
    
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
}

function renderCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    updateCanvasSize(canvas);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (state.isImageLoaded) {
        drawImage(ctx, canvas);
        drawRectangles(ctx);
    } else {
        drawPlaceholder(canvas, ctx, 'Place your image at wwwroot/sample-image.jpg');
    }
}

function drawImage(ctx, canvas) {
    ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
}

function drawRectangles(ctx) {
    // Draw completed rectangles
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    
    state.currentRectangles.forEach(rect => {
        const scaled = scaleRectangle(rect);
        ctx.strokeRect(scaled.x, scaled.y, scaled.width, scaled.height);
        ctx.fillRect(scaled.x, scaled.y, scaled.width, scaled.height);
    });
    
    // Draw current rectangle being drawn
    if (state.currentDrawingRect) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        
        const scaled = scaleRectangle(state.currentDrawingRect);
        ctx.strokeRect(scaled.x, scaled.y, scaled.width, scaled.height);
        ctx.fillRect(scaled.x, scaled.y, scaled.width, scaled.height);
    }
}

function scaleRectangle(rect) {
    return {
        x: rect.x * state.zoomLevel,
        y: rect.y * state.zoomLevel,
        width: rect.width * state.zoomLevel,
        height: rect.height * state.zoomLevel
    };
}

// ============================================================================
// Zoom Controls
// ============================================================================
window.zoomIn = function(canvas) {
    if (!state.isImageLoaded) return;
    state.zoomLevel = Math.min(10, state.zoomLevel * 1.2);
    renderCanvas(canvas);
};

window.zoomOut = function(canvas) {
    if (!state.isImageLoaded) return;
    state.zoomLevel = Math.max(0.1, state.zoomLevel / 1.2);
    renderCanvas(canvas);
};

window.resetZoom = function(canvas) {
    if (!state.isImageLoaded) return;
    state.zoomLevel = 1.0;
    renderCanvas(canvas);
};

window.getZoomLevel = function() {
    return state.zoomLevel;
};

// ============================================================================
// Panning Controls
// ============================================================================
window.startPan = function(clientX, clientY) {
    state.isPanning = true;
    state.lastPanPoint = { x: clientX, y: clientY };
};

window.updatePan = function(canvas, clientX, clientY) {
    if (!state.isPanning) return false;
    
    const dx = clientX - state.lastPanPoint.x;
    const dy = clientY - state.lastPanPoint.y;
    
    const scrollContainer = canvas.closest('.canvas-area');
    if (scrollContainer) {
        scrollContainer.scrollLeft -= dx;
        scrollContainer.scrollTop -= dy;
    }
    
    state.lastPanPoint = { x: clientX, y: clientY };
    return true;
};

window.endPan = function() {
    state.isPanning = false;
};

// ============================================================================
// Coordinate Conversion
// ============================================================================
window.screenToCanvasCoordinates = function(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * state.baseCanvasSize.width;
    const y = ((clientY - rect.top) / rect.height) * state.baseCanvasSize.height;
    return { x, y };
};

// ============================================================================
// Public API for Blazor Integration
// ============================================================================
window.redrawCanvas = function(canvas, rectangles, currentRectangle) {
    state.currentRectangles = rectangles || [];
    state.currentDrawingRect = currentRectangle;
    renderCanvas(canvas);
};
