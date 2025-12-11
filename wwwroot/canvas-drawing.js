let canvasImage = new Image();
let imageLoaded = false;
let zoomLevel = 1.0;
let isPanning = false;
let lastPanPoint = { x: 0, y: 0 };
let baseCanvasWidth = 800;
let baseCanvasHeight = 600;

const MAX_INTERNAL_DIMENSION = 4096;
const MAX_INTERNAL_PIXELS = 4096 * 4096;
const MIN_RENDER_SCALE = 0.05;

const canvasState = new WeakMap();

function getCanvasState(canvas) {
    let state = canvasState.get(canvas);
    if (!state) {
        state = {
            rectangles: [],
            currentRectangle: null,
            redrawRequested: false,
            redrawHandle: null
        };
        canvasState.set(canvas, state);
    }
    return state;
}

function scheduleRedraw(canvas) {
    const state = getCanvasState(canvas);
    if (state.redrawRequested) {
        return;
    }

    state.redrawRequested = true;
    state.redrawHandle = window.requestAnimationFrame(() => {
        state.redrawRequested = false;
        state.redrawHandle = null;
        performCanvasDraw(canvas);
    });
}

function performCanvasDraw(canvas) {
    const state = getCanvasState(canvas);
    const ctx = canvas.getContext('2d');

    const rectangles = state.rectangles || [];
    const currentRectangle = state.currentRectangle;

    const renderScale = updateCanvasSize(canvas);

    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.clearRect(0, 0, baseCanvasWidth, baseCanvasHeight);

    if (imageLoaded) {
        ctx.drawImage(canvasImage, 0, 0, baseCanvasWidth, baseCanvasHeight);
    } else {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, baseCanvasWidth, baseCanvasHeight);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2 / renderScale;
        ctx.strokeRect(0, 0, baseCanvasWidth, baseCanvasHeight);
        ctx.fillStyle = '#666';
        ctx.font = `${20 / renderScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Place your image at wwwroot/sample-image.jpg', baseCanvasWidth / 2, baseCanvasHeight / 2);
    }

    ctx.lineWidth = 2 / renderScale;

    if (rectangles && rectangles.length > 0) {
        ctx.strokeStyle = '#ff0000';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';

        rectangles.forEach(rect => {
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        });
    }

    if (currentRectangle) {
        ctx.strokeStyle = '#00ff00';
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.strokeRect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
        ctx.fillRect(currentRectangle.x, currentRectangle.y, currentRectangle.width, currentRectangle.height);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

window.initializeCanvas = function(canvas) {
    const ctx = canvas.getContext('2d');

    // Draw placeholder initially
    drawPlaceholder(canvas, ctx, 'Click "Load Image" to display an image');

    canvas.addEventListener('wheel', function(e) {
        e.preventDefault();

        if (!imageLoaded) return;

        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        zoomLevel = Math.max(0.1, Math.min(10, zoomLevel * zoomDelta));

        window.redrawCanvas(canvas);
    }, { passive: false });
};

window.loadImageByPath = function(canvas, imagePath) {
    const ctx = canvas.getContext('2d');
    
    // Reset the image and transform
    canvasImage = new Image();
    imageLoaded = false;
    zoomLevel = 1.0;

    
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

        const state = getCanvasState(canvas);
        state.rectangles = [];
        state.currentRectangle = null;
        
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

function normalizeRect(rect) {
    if (!rect) {
        return null;
    }

    return {
        x: Number(rect.x ?? rect.X ?? 0),
        y: Number(rect.y ?? rect.Y ?? 0),
        width: Number(rect.width ?? rect.Width ?? 0),
        height: Number(rect.height ?? rect.Height ?? 0)
    };
}

function updateCanvasSize(canvas) {
    const desiredWidth = Math.max(1, Math.round(baseCanvasWidth * zoomLevel));
    const desiredHeight = Math.max(1, Math.round(baseCanvasHeight * zoomLevel));

    canvas.style.width = desiredWidth + 'px';
    canvas.style.height = desiredHeight + 'px';

    const baseArea = Math.max(1, baseCanvasWidth * baseCanvasHeight);

    const maxScaleByWidth = MAX_INTERNAL_DIMENSION / baseCanvasWidth;
    const maxScaleByHeight = MAX_INTERNAL_DIMENSION / baseCanvasHeight;
    const maxScaleByPixels = Math.sqrt(MAX_INTERNAL_PIXELS / baseArea);

    let maxScale = Math.min(maxScaleByWidth, maxScaleByHeight, maxScaleByPixels);
    if (!Number.isFinite(maxScale) || maxScale <= 0) {
        maxScale = 1;
    }

    maxScale = Math.max(MIN_RENDER_SCALE, maxScale);
    const renderScale = Math.min(zoomLevel, maxScale);

    const internalWidth = Math.max(1, Math.round(baseCanvasWidth * renderScale));
    const internalHeight = Math.max(1, Math.round(baseCanvasHeight * renderScale));

    if (canvas.width !== internalWidth || canvas.height !== internalHeight) {
        canvas.width = internalWidth;
        canvas.height = internalHeight;
    }

    return renderScale;
}

window.zoomIn = function(canvas) {
    if (!imageLoaded) return;

    zoomLevel = Math.min(10, zoomLevel * 1.2);

    window.redrawCanvas(canvas);
};

window.zoomOut = function(canvas) {
    if (!imageLoaded) return;

    zoomLevel = Math.max(0.1, zoomLevel / 1.2);

    window.redrawCanvas(canvas);
};

window.resetZoom = function(canvas) {
    if (!imageLoaded) return;

    zoomLevel = 1.0;

    window.redrawCanvas(canvas);
};

window.getZoomLevel = function() {
    return zoomLevel;
};

window.startPan = function(clientX, clientY) {
    isPanning = true;
    lastPanPoint = { x: clientX, y: clientY };
};

window.updatePan = function(canvas, clientX, clientY) {
    if (!isPanning) return false;
    
    const dx = clientX - lastPanPoint.x;
    const dy = clientY - lastPanPoint.y;
    
    // Get the scrollable container (canvas-area)
    const scrollContainer = canvas.closest('.canvas-area');
    if (scrollContainer) {
        // Pan by adjusting scroll position (inverted for natural feel)
        scrollContainer.scrollLeft -= dx;
        scrollContainer.scrollTop -= dy;
    }
    
    lastPanPoint = { x: clientX, y: clientY };
    
    return true;
};

window.endPan = function() {
    isPanning = false;
};

window.redrawCanvas = function(canvas, rectangles, currentRectangle) {
    const state = getCanvasState(canvas);

    if (arguments.length >= 2) {
        state.rectangles = Array.isArray(rectangles)
            ? rectangles.map(normalizeRect)
            : [];
    }

    if (arguments.length >= 3) {
        state.currentRectangle = normalizeRect(currentRectangle);
    }

    scheduleRedraw(canvas);
};
