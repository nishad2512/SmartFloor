// Global state variables
let currentFiles = new DataTransfer();
let deletedImages = [];
let filesToProcess = [];
let cropper = null;

// Get EJS variables for image handling
const initialExistingImagesCount = PRODUCT_DATA.imageCount || 0;
const imageInput = document.getElementById("image-input");

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize deletedImages array from the hidden input
    const deletedInput = document.getElementById("deleted-images-input");
    if (deletedInput.value) {
        try {
            deletedImages = JSON.parse(deletedInput.value);
        } catch (e) {
            console.error("Error parsing initial deletedImages value:", e);
        }
    }

    // 2. Attach instant feedback listeners (optional, but good UX)
    document
        .getElementById("product-name")
        .addEventListener("input", validateProductInfo);
    document
        .getElementById("category")
        .addEventListener("change", validateProductInfo);
    document
        .getElementById("description")
        .addEventListener("input", validateProductInfo);
});

// --- IMAGE CROP/UPLOAD LOGIC (Standard Functions) ---

function previewImages(event) {
    const input = event.target;
    const existingFiles = Array.from(currentFiles.files);
    const newFiles = Array.from(input.files).filter((file) => {
        const exists = existingFiles.some(
            (existingFile) =>
                existingFile.name === file.name &&
                existingFile.size === file.size &&
                existingFile.lastModified === file.lastModified
        );
        return !exists;
    });

    if (newFiles.length > 0) {
        filesToProcess = newFiles;
        input.value = "";
        processNextFile();
    } else {
        updateInputFiles();
    }
}

function processNextFile() {
    if (filesToProcess.length === 0) {
        updateInputFiles();
        renderPreviews();
        return;
    }
    // ... (rest of processNextFile, showCropperModal, hideCropperModal, saveCrop, skipCrop remain the same)
    const file = filesToProcess[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const image = document.getElementById("cropper-image");
        image.src = e.target.result;
        showCropperModal();
        if (cropper) {
            cropper.destroy();
        }
        cropper = new Cropper(image, {
            aspectRatio: NaN,
            viewMode: 1,
            dragMode: "move",
            autoCropArea: 0.9,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    };
    reader.readAsDataURL(file);
}

function showCropperModal() {
    document.getElementById("cropper-modal").classList.remove("hidden");
}
function hideCropperModal() {
    const modal = document.getElementById("cropper-modal");
    modal.classList.add("hidden");
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

function saveCrop() {
    if (!cropper) return;
    const fileToReplace = filesToProcess.shift();
    cropper
        .getCroppedCanvas({
            maxWidth: 4096,
            maxHeight: 4096,
            fillColor: "#fff",
        })
        .toBlob((blob) => {
            if (blob) {
                const newFile = new File([blob], fileToReplace.name, {
                    type: fileToReplace.type,
                    lastModified: Date.now(),
                });
                currentFiles.items.add(newFile);
            } else {
                currentFiles.items.add(fileToReplace);
            }
            hideCropperModal();
            processNextFile();
        }, fileToReplace.type);
}

function skipCrop() {
    const file = filesToProcess.shift();
    currentFiles.items.add(file);
    hideCropperModal();
    processNextFile();
}

function updateInputFiles() {
    imageInput.files = currentFiles.files;
}

function renderPreviews() {
    const previewContainer = document.getElementById("image-preview");
    const newPreviews = previewContainer.querySelectorAll(".new-preview");
    newPreviews.forEach((el) => el.remove());

    previewContainer.className =
        "flex gap-2 mt-4 overflow-x-auto p-2 pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600";

    Array.from(currentFiles.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const div = document.createElement("div");
            div.className =
                "relative group shrink-0 w-20 h-20 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-[#2a2a2a] new-preview";

            const img = document.createElement("img");
            img.src = e.target.result;
            img.className =
                "w-full h-full object-cover transition-transform group-hover:scale-110 duration-300";

            const overlay = document.createElement("div");
            overlay.className =
                "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center";

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className =
                "p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors transform hover:scale-110";
            btn.innerHTML =
                '<span class="material-symbols-outlined text-[10px] font-bold block">close</span>';
            btn.onclick = (e) => {
                e.preventDefault();
                removeImage(index);
            };

            overlay.appendChild(btn);
            div.appendChild(img);
            div.appendChild(overlay);
            previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function removeImage(index) {
    const newDt = new DataTransfer();
    Array.from(currentFiles.files).forEach((file, i) => {
        if (i !== index) newDt.items.add(file);
    });
    currentFiles = newDt;
    updateInputFiles();
    renderPreviews();
}

function removeEditedImage(index, btn) {
    // Add the index of the image being deleted (which is an index in the server's array)
    if (!deletedImages.includes(index)) {
        deletedImages.push(index);
    }

    // Update the hidden input field for the backend
    document.getElementById("deleted-images-input").value =
        JSON.stringify(deletedImages);

    // Visually remove the element
    const container = btn.closest(".relative");
    container.remove();
}

function addVariant() {
    // Add variant logic (using 'size', 'stock', 'price' as singular names for dynamically added fields)
    const container = document.getElementById("variant-container"); // Assuming you have a container for new variants
    const newRow = document.createElement("div");
    newRow.className = "grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-center";
    newRow.innerHTML = `
            <input class="w-full bg-transparent border-[#e0e0e0] dark:border-primary/20 rounded-lg focus:ring-primary focus:border-primary text-sm" placeholder='eg: 6" x 48"' type="text" name="size" required />
            <input class="w-full bg-transparent border-[#e0e0e0] dark:border-primary/20 rounded-lg focus:ring-primary focus:border-primary text-sm text-center" placeholder="eg: 50" type="number" name="stock" min="0" required />
            <input class="w-full bg-transparent border-[#e0e0e0] dark:border-primary/20 rounded-lg focus:ring-primary focus:border-primary text-sm text-center" placeholder="eg: $5.99" type="text" name="price" required pattern="^\\$?\\d+(\\.\\d{2})?$" />
            <button type="button" onclick="this.parentElement.remove()" class="p-2 text-[#757575] dark:text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-primary/30 rounded-full transition-colors">
                <span class="material-symbols-outlined text-xl">delete</span>
            </button>
        `;
    container.parentNode.insertBefore(newRow, container.nextSibling);
}

// --- REPLICATED VALIDATION FUNCTIONS (From createProduct page) ---

// General function to display/hide error messages
function toggleError(id, show, message = "") {
    const errorElement = document.getElementById(id);
    if (errorElement) {
        errorElement.textContent = message;
        // Note: Since this is the edit page, the elements 'name-error', 'category-error', etc.,
        // were not included in the provided edit HTML, but the check still prevents submit.
    }
}

// 1. Validate Product Info Fields (Used for instant feedback and pre-submit check)
function validateProductInfo() {
    let isValid = true;
    const nameInput = document.getElementById("product-name");
    const categorySelect = document.getElementById("category");
    const descriptionTextarea = document.getElementById("description");

    if (nameInput.value.trim() === "") {
        toggleError("name-error", true, "Product Name is required.");
        isValid = false;
    } else {
        toggleError("name-error", false);
    }

    if (categorySelect.value === "") {
        toggleError("category-error", true, "Category is required.");
        isValid = false;
    } else {
        toggleError("category-error", false);
    }

    if (descriptionTextarea.value.trim() === "") {
        toggleError(
            "description-error",
            true,
            "Product Description is required."
        );
        isValid = false;
    } else {
        toggleError("description-error", false);
    }

    return isValid;
}

// 2. Validate Images (CRITICAL FOR EDIT PAGE)
function validateImages() {
    const deletedCount = deletedImages.length;
    const newImagesCount = currentFiles.files.length;

    // Calculate the total number of images that will remain/be saved
    const totalImages =
        initialExistingImagesCount - deletedCount + newImagesCount;

    return totalImages >= 3;
}

// 3. Validate Variants
function validateVariants() {
    // NOTE: The edit form variant naming uses singular 'size', 'stock', 'price' for the EJS loop,
    // but uses the same HTML structure for new additions.
    // For simplicity and matching the old script, we check for presence.

    // We look for any input named 'size', 'stock', or 'price'
    const sizeInputs = document.querySelectorAll('input[name="size"]');
    const stockInputs = document.querySelectorAll('input[name="stock"]');
    const priceInputs = document.querySelectorAll('input[name="price"]');

    // Ensure at least one variant set is present and complete
    if (sizeInputs.length === 0) return false;

    let hasValidVariant = false;

    for (let i = 0; i < sizeInputs.length; i++) {
        const size = sizeInputs[i].value.trim();
        const stock = stockInputs[i].value.trim();
        const price = priceInputs[i].value.trim();

        if (size !== "" && stock !== "" && price !== "") {
            hasValidVariant = true;
            break;
        }
    }

    return hasValidVariant;
}

// 4. Final Form Validation on Submit with SweetAlert2
document.querySelector("form").addEventListener("submit", function (e) {
    const isInfoValid = validateProductInfo();
    const isImagesValid = validateImages();
    const isVariantsValid = validateVariants();

    if (!isInfoValid || !isImagesValid || !isVariantsValid) {
        e.preventDefault();

        let errorMessage = "Please correct the following issues:";

        if (!isInfoValid) {
            errorMessage +=
                "\n- Product Name, Category, and Description are required.";
        }

        if (!isImagesValid) {
            const deletedCount = deletedImages.length;
            const newImagesCount = currentFiles.files.length;
            const totalImages =
                initialExistingImagesCount - deletedCount + newImagesCount;
            errorMessage += `\n- Product must have a minimum of 3 images. You currently have ${totalImages} remaining/uploaded.`;
        }

        if (!isVariantsValid) {
            errorMessage +=
                "\n- At least one complete product variant (Size, Stock, Price) is required.";
        }

        // Use SweetAlert2
        if (typeof Swal !== "undefined") {
            Swal.fire({
                icon: "error",
                title: "Update Validation Failed!",
                html: errorMessage.replace(/\n/g, "<br>"),
                confirmButtonText: "I understand",
                customClass: {
                    confirmButton: "bg-primary hover:bg-primary/90",
                },
            });
        } else {
            alert(errorMessage);
        }
    }
});
