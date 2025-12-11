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
        
        // Store old zoom
        const oldZoom = state.zoomLevel;
        
        // Get mouse position relative to the canvas itself
        const canvasRect = canvas.getBoundingClientRect();
        const mouseXInCanvas = e.clientX - canvasRect.left;
        const mouseYInCanvas = e.clientY - canvasRect.top;
        
        // Apply zoom
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.4, Math.min(5, state.zoomLevel * zoomDelta));
        
        // Only update if zoom actually changed
        if (newZoom === state.zoomLevel) return;
        
        state.zoomLevel = newZoom;
        
        // Update canvas size (CSS only, not internal resolution)
        updateCanvasSize(canvas);
        
        // Redraw rectangles with new zoom
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawImage(ctx, canvas);
        drawRectangles(ctx);
        
        // Calculate how much the canvas size changed
        const zoomRatio = state.zoomLevel / oldZoom;
        
        // Calculate new canvas position to keep mouse point stationary
        // New offset = old offset scaled by zoom ratio
        const newCanvasRect = canvas.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        
        // Desired position of mouse in new canvas
        const newMouseXInCanvas = mouseXInCanvas * zoomRatio;
        const newMouseYInCanvas = mouseYInCanvas * zoomRatio;
        
        // Calculate required scroll to keep mouse at same viewport position
        const newScrollX = (newCanvasRect.left - containerRect.left) + newMouseXInCanvas - (e.clientX - containerRect.left);
        const newScrollY = (newCanvasRect.top - containerRect.top) + newMouseYInCanvas - (e.clientY - containerRect.top);
        
        // Apply scroll adjustment
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
    // Set canvas internal resolution once (based on base size)
    if (canvas.width !== state.baseCanvasSize.width || canvas.height !== state.baseCanvasSize.height) {
        canvas.width = state.baseCanvasSize.width;
        canvas.height = state.baseCanvasSize.height;
    }
    
    // Use CSS transform for scaling - much more performant
    const displayWidth = Math.round(state.baseCanvasSize.width * state.zoomLevel);
    const displayHeight = Math.round(state.baseCanvasSize.height * state.zoomLevel);
    
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
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
    // Draw rectangles at base size (zoom is handled by CSS)
    // Draw completed rectangles
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2 / state.zoomLevel; // Adjust line width for zoom
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    
    state.currentRectangles.forEach(rect => {
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    });
    
    // Draw current rectangle being drawn
    if (state.currentDrawingRect) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2 / state.zoomLevel; // Adjust line width for zoom
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        
        ctx.strokeRect(state.currentDrawingRect.x, state.currentDrawingRect.y, 
                      state.currentDrawingRect.width, state.currentDrawingRect.height);
        ctx.fillRect(state.currentDrawingRect.x, state.currentDrawingRect.y, 
                    state.currentDrawingRect.width, state.currentDrawingRect.height);
    }
}

// ============================================================================
// Zoom Controls
// ============================================================================
window.zoomIn = function(canvas) {
    if (!state.isImageLoaded) return;
    state.zoomLevel = Math.min(5, state.zoomLevel * 1.2);
    renderCanvas(canvas);
};

window.zoomOut = function(canvas) {
    if (!state.isImageLoaded) return;
    state.zoomLevel = Math.max(0.4, state.zoomLevel / 1.2);
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
