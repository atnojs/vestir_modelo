document.addEventListener('DOMContentLoaded', () => {
    // Selectores de elementos del DOM
    const modelDropZone = document.getElementById('model-drop-zone');
    const modelInput = document.getElementById('model-input');
    const modelPreview = document.getElementById('model-preview');
    const modelPrompt = document.getElementById('model-prompt');
    const outfitDropZone = document.getElementById('outfit-drop-zone');
    const outfitInput = document.getElementById('outfit-input');
    const outfitPreview = document.getElementById('outfit-preview');
    const outfitPrompt = document.getElementById('outfit-prompt');
    const compositionSelector = document.getElementById('composition-selector');
    const generateBtn = document.getElementById('generate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const loadingSection = document.getElementById('loading-section');
    const resultsSection = document.getElementById('results-section');
    const resultsGrid = document.getElementById('results-grid');
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightbox = document.getElementById('close-lightbox');

    // Estado
    let modelFile = null;
    let outfitFile = null;
    let selectedCompositions = [];

    // Estilos/composiciones
    const compositions = [
        { id: 'full-body', title: 'Estudio Profesional', description: 'Cuerpo completo en estudio.', prompt: "Genera una imagen de una fotografía de moda de cuerpo completo: la modelo de la segunda imagen lleva la prenda de la primera de forma estilizada. Fondo de estudio blanco y limpio, iluminación profesional, pose elegante." },
        { id: 'urban-editorial', title: 'Editorial Urbano', description: 'Sesión en entorno de ciudad.', prompt: "Genera una imagen de una fotografía editorial de moda: la modelo de la segunda imagen lleva la prenda de la primera en una calle urbana moderna. Pose dinámica, estilo cinematográfico." },
        { id: 'neon-night', title: 'Neón y Noche', description: 'Ciudad de noche, luces de neón.', prompt: "Genera una imagen de una fotografía de moda: la modelo de la segunda imagen lleva la prenda de la primera en una azotea con ciudad iluminada por neón. Estética moderna, ambiente sofisticado." },
        { id: 'majestic-interior', title: 'Interior Majestuoso', description: 'Museo, biblioteca, hotel de lujo.', prompt: "Genera una imagen de una sesión de moda: la modelo de la segunda imagen lleva la prenda de la primera en un museo o hotel de lujo. Iluminación dramática, opulencia." },
        { id: 'park-walk', title: 'Paseo por el Parque', description: 'Estilo casual y espontáneo.', prompt: "Genera una imagen de una fotografía de street style: la modelo de la segunda imagen lleva la prenda de la primera paseando por un parque urbano. Look natural, luz del día." },
        { id: 'beach-minimalism', title: 'Minimalismo en Playa', description: 'Amanecer/atardecer, colores suaves.', prompt: "Genera una imagen de una composición de moda minimalista: la modelo de la segunda imagen lleva la prenda de la primera en una playa al atardecer. Colores suaves, luz difusa." },
        { id: 'industrial-contrast', title: 'Contraste Industrial', description: 'Fábrica, grafitis, vanguardista.', prompt: "Genera una imagen de una sesión de fotos vanguardista: la modelo de la segunda imagen lleva la prenda de la primera en una fábrica con grafitis. Contraste rudo y moda." },
        { id: 'cafe-atmosphere', title: 'Ambiente de Cafetería', description: 'Escena íntima y cotidiana.', prompt: "Genera una imagen de una escena de lifestyle: la modelo de la segunda imagen lleva la prenda de la primera en una cafetería. Iluminación acogedora." },
        { id: 'pub-atmosphere', title: 'Ambiente de Pub', description: 'Escena tomando una copa.', prompt: "Genera una imagen de una escena de lifestyle: la modelo de la segunda imagen lleva la prenda de la primera en un pub. Iluminación alegre, ambiente joven." },
    ];

    // Render selector de composiciones
    function renderCompositionSelector() {
        compositionSelector.innerHTML = '';
        compositions.forEach(comp => {
            const card = document.createElement('div');
            card.className = 'composition-card bg-gray-800 rounded-lg p-3 text-center';
            card.dataset.id = comp.id;
            card.innerHTML = `
                <h4 class="font-semibold text-white text-sm">${comp.title}</h4>
                <p class="text-xs text-gray-400 mt-1">${comp.description}</p>
            `;
            if (selectedCompositions.includes(comp.id)) card.classList.add('selected');
            card.addEventListener('click', () => handleCompositionSelect(comp.id));
            compositionSelector.appendChild(card);
        });
    }

    function handleCompositionSelect(id) {
        const i = selectedCompositions.indexOf(id);
        if (i > -1) selectedCompositions.splice(i, 1);
        else {
            if (selectedCompositions.length >= 2) selectedCompositions.shift();
            selectedCompositions.push(id);
        }
        renderCompositionSelector();
        updateGenerateButtonState();
    }

    // Utilidades
    const resizeImage = (file, maxSize = 1024) => new Promise((resolve) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        img.onload = () => {
            let { width, height } = img;
            if (width > height) {
                if (width > maxSize) height = (height * maxSize) / width, width = maxSize;
            } else {
                if (height > maxSize) width = (width * maxSize) / height, height = maxSize;
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(resolve, 'image/jpeg', 0.9);
        };
        img.src = URL.createObjectURL(file);
    });

    const toBase64 = blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
    });

    const updateGenerateButtonState = () => {
        generateBtn.disabled = !(modelFile && outfitFile && selectedCompositions.length > 0);
    };

    const showError = (msg) => {
        if (msg.includes('Respuesta de texto en vez de imagen')) {
            msg += ' Tip: El modelo devolvió texto. Usa imágenes más claras o simplifica el estilo. Intenta de nuevo.';
        } else if (msg.includes('IMAGE_OTHER')) {
            msg += ' Tip: Puede ser un bug de la API. Usa imágenes pequeñas/sin rostros o genera 1 estilo.';
        }
        errorMessage.textContent = msg;
        errorSection.classList.remove('hidden');
        loadingSection.classList.add('hidden');
    };
    const hideError = () => { errorSection.classList.add('hidden'); };

    // Llamada a backend (proxy.php)
    const callGeminiApi = async (prompt, modelImage, outfitImage) => {
        const payload = { prompt, modelImage, outfitImage, model: 'gemini-2.5-flash-image' };
        let attempt = 0, maxAttempts = 5;

        while (attempt < maxAttempts) {
            try {
                const res = await fetch('./proxy.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const text = await res.text();
                
                let data;
                try { 
                    data = JSON.parse(text); 
                } catch { 
                    console.error('Respuesta no JSON del servidor:', text);
                    throw new Error('Respuesta inválida del servidor.'); 
                }

                if (!res.ok) {
                    const msg = data?.error?.message || data?.error || `Error HTTP ${res.status}`;
                    throw new Error(msg);
                }

                if (data.promptFeedback && data.promptFeedback.blockReason) {
                    throw new Error(`Bloqueado por seguridad: ${data.promptFeedback.blockReason}`);
                }
                if (!data.candidates || data.candidates.length === 0) {
                    console.error('Respuesta sin "candidates":', data);
                    throw new Error("La respuesta de la API no contiene 'candidates'.");
                }
                const candidate = data.candidates[0];
                if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                    console.error('Generación detenida:', candidate.finishReason, data);
                    throw new Error(`Generación detenida: ${candidate.finishReason}`);
                }
                const imagePart = candidate.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData?.data) {
                    const imageData = `data:image/png;base64,${imagePart.inlineData.data}`;
                    return imageData;
                }

                const textPart = candidate.content?.parts?.find(p => p.text);
                if (textPart?.text) throw new Error(`Respuesta de texto en vez de imagen: "${textPart.text}"`);

                console.error('Sin datos de imagen:', data);
                throw new Error('No se encontró imagen en la respuesta.');
            } catch (err) {
                console.error(`Intento ${attempt + 1} fallido:`, err);
                attempt++;
                if (attempt >= maxAttempts) throw err;
                await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)));
            }
        }
    };

    // Dropzones
    const setupDropZone = (dropZone, input, preview, promptEl, fileStore) => {
        dropZone.addEventListener('click', () => input.click());
        ['dragenter','dragover','dragleave','drop'].forEach(ev =>
            dropZone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }, false)
        );
        ['dragenter','dragover'].forEach(ev =>
            dropZone.addEventListener(ev, () => dropZone.classList.add('dragover'), false)
        );
        ['dragleave','drop'].forEach(ev =>
            dropZone.addEventListener(ev, () => dropZone.classList.remove('dragover'), false)
        );

        const handleFile = async (file) => {
            if (file && file.type.startsWith('image/')) {
                hideError();
                const resizedBlob = await resizeImage(file);
                const base64 = await toBase64(resizedBlob);
                const mimeType = 'image/jpeg';
                fileStore({ base64, mimeType });
                preview.src = URL.createObjectURL(resizedBlob);
                preview.classList.remove('hidden');
                promptEl.classList.add('hidden');
                updateGenerateButtonState();
            } else {
                showError('Sube una imagen válida (JPG, PNG, etc.).');
            }
        };
        dropZone.addEventListener('drop', e => handleFile(e.dataTransfer.files[0]));
        input.addEventListener('change', e => handleFile(e.target.files[0]));
    };

    setupDropZone(modelDropZone, modelInput, modelPreview, modelPrompt, data => modelFile = data);
    setupDropZone(outfitDropZone, outfitInput, outfitPreview, outfitPrompt, data => outfitFile = data);

    // Helpers UI para tarjetas
    function insertPlaceholderCard(comp, indexForComp) {
        const uid = `${comp.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const cardHTML = `
            <div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg relative group">
                <img data-uid="${uid}" src="https://placehold.co/600x800/1f2937/4b5563?text=Generando..." alt="${comp.title} ${indexForComp}" class="result-image w-full h-auto object-cover aspect-[3/4]">
                <button class="close-btn" title="Eliminar esta imagen">×</button>
                <div class="p-4">
                    <div class="flex justify-between items-center">
                        <div>
                            <h3 class="font-semibold text-white">${comp.title} <span class="text-xs text-gray-400">#${indexForComp}</span></h3>
                            <p class="text-sm text-gray-400">${comp.description}</p>
                        </div>
                        <a href="#" download="${comp.id}-${indexForComp}.png" class="download-btn hidden ml-4 flex-shrink-0 inline-flex items-center justify-center bg-blue-600 text-white rounded-full h-10 w-10 hover:bg-blue-700 transition-colors" title="Descargar imagen">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 8a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L13 11.586V8z" /><path d="M3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>
                        </a>
                    </div>
                </div>
            </div>`;
        resultsGrid.insertAdjacentHTML('afterbegin', cardHTML);
        const imgElement = resultsGrid.querySelector(`img[data-uid="${uid}"]`);
        return imgElement?.closest('.bg-gray-800') || null;
    }

    // Principal: generar 2 imágenes por estilo, en secuencia global
    generateBtn.addEventListener('click', async () => {
        if (!modelFile || !outfitFile || selectedCompositions.length === 0) return;

        hideError();
        resultsSection.classList.remove('hidden');
        loadingSection.classList.remove('hidden');
        downloadAllBtn.classList.add('hidden');

        const selected = selectedCompositions.map(id => compositions.find(c => c.id === id));
        let successCount = 0;

        try {
            for (const comp of selected) {
                for (let copy = 1; copy <= 2; copy++) {
                    // Crear placeholder para esta generación
                    const card = insertPlaceholderCard(comp, copy);
                    if (!card) continue;
                    const imgElement = card.querySelector('.result-image');
                    const downloadBtn = card.querySelector('.download-btn');

                    try {
                        // Esperar a que termine antes de pasar a la siguiente
                        const src = await callGeminiApi(comp.prompt, modelFile, outfitFile);
                        imgElement.src = src;
                        downloadBtn.href = src;
                        downloadBtn.classList.remove('hidden');
                        successCount++;
                        setupLightbox();
                    } catch (err) {
                        console.error(`Fallo generando ${comp.title} #${copy}:`, err);
                        // Eliminar sólo el placeholder fallido y mostrar error no bloqueante
                        card.remove();
                        showError(`Error al generar "${comp.title}" #${copy}: ${err.message}`);
                    }
                }
            }
        } finally {
            loadingSection.classList.add('hidden');
            if (successCount > 0) downloadAllBtn.classList.remove('hidden');
        }
    });

    resetBtn.addEventListener('click', () => {
        modelFile = null;
        outfitFile = null;
        selectedCompositions = [];

        modelPreview.classList.add('hidden');
        modelPrompt.classList.remove('hidden');
        modelInput.value = '';

        outfitPreview.classList.add('hidden');
        outfitPrompt.classList.remove('hidden');
        outfitInput.value = '';

        renderCompositionSelector();
        updateGenerateButtonState();
        resultsSection.classList.add('hidden');
        resultsGrid.innerHTML = '';
        hideError();
        downloadAllBtn.classList.add('hidden');
    });

    // Descargar ZIP
    downloadAllBtn.addEventListener('click', () => {
        if (typeof JSZip === 'undefined') {
            showError('Error: La librería JSZip no está disponible. Revisa la conexión a internet o la carga del script.');
            return;
        }

        const zip = new JSZip();
        const imgs = resultsGrid.querySelectorAll('.result-image');
        let hasValidImages = false;

        imgs.forEach((img, index) => {
            const src = img.src;
            const alt = img.alt || `image-${index}`;
            if (!src || src.startsWith('https://placehold.co')) return;

            try {
                const base64Match = src.match(/^data:image\/.+;base64,(.+)$/);
                if (base64Match && base64Match[1]) {
                    const base64Data = base64Match[1];
                    const fileName = `${alt.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${index + 1}.png`;
                    zip.file(fileName, base64Data, { base64: true });
                    hasValidImages = true;
                } else {
                    console.warn(`Imagen no válida para ${alt}: ${src}`);
                }
            } catch (err) {
                console.error(`Error procesando la imagen ${alt}:`, err);
            }
        });

        if (!hasValidImages) {
            showError('No hay imágenes válidas para descargar.');
            return;
        }

        zip.generateAsync({ type: 'blob' })
            .then(content => {
                if (content.size === 0) throw new Error('El archivo ZIP generado está vacío.');
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'fotografias-editoriales.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            })
            .catch(err => {
                console.error('Error generando el ZIP:', err);
                showError('No se pudo generar el archivo ZIP: ' + err.message);
            });
    });

    // Lightbox
    function setupLightbox() {
        resultsGrid.querySelectorAll('.result-image').forEach(img => {
            if (img.dataset.lightboxAttached) return;
            img.dataset.lightboxAttached = true;
            img.addEventListener('click', (e) => {
                if (e.target.src && !e.target.src.startsWith('https://placehold.co')) {
                    lightboxImg.src = e.target.src;
                    lightbox.classList.remove('hidden');
                }
            });
        });
    }
    const closeLightboxHandler = () => {
        lightbox.classList.add('hidden');
        lightboxImg.src = '';
    };
    closeLightbox.addEventListener('click', closeLightboxHandler);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightboxHandler(); });

    // Inicialización
    renderCompositionSelector();

    // Botón cerrar tarjeta
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-btn')) {
            e.target.closest('.bg-gray-800')?.remove();
        }
    });
});
