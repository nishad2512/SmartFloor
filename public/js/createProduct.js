let currentFiles = new DataTransfer();
let filesToProcess = [];
let cropper = null;
const imageInput = document.getElementById("image-input");
const variantList = document.getElementById("variant-list");

function previewImages(event) {
    const input = event.target;
    // ... (rest of previewImages function remains the same)
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
        // All files processed
        updateInputFiles();
        renderPreviews();
        // Run image validation after processing is complete
        validateImages();
        return;
    }

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
            aspectRatio: NaN, // Free crop
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
    const modal = document.getElementById("cropper-modal");
    modal.classList.remove("hidden");
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

    const fileToReplace = filesToProcess.shift(); // Remove currently processing file

    cropper
        .getCroppedCanvas({
            maxWidth: 4096,
            maxHeight: 4096,
            fillColor: "#fff",
        })
        .toBlob((blob) => {
            if (!blob) {
                // If something fails, just add original
                currentFiles.items.add(fileToReplace);
            } else {
                // Recreate file from blob
                const newFile = new File([blob], fileToReplace.name, {
                    type: fileToReplace.type,
                    lastModified: Date.now(),
                });
                currentFiles.items.add(newFile);
            }

            hideCropperModal();
            processNextFile();
        }, fileToReplace.type);
}

function skipCrop() {
    const file = filesToProcess.shift();
    currentFiles.items.add(file); // Add original
    hideCropperModal();
    processNextFile();
}

function updateInputFiles() {
    imageInput.files = currentFiles.files;
}

function renderPreviews() {
    const previewContainer = document.getElementById("image-preview");
    previewContainer.innerHTML = "";
    previewContainer.className =
        "flex gap-4 mt-4 overflow-x-auto p-2 pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600";

    Array.from(currentFiles.files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const div = document.createElement("div");
            div.className =
                "relative group shrink-0 w-24 h-24 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-[#2a2a2a]";

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
                '<span class="material-symbols-outlined text-[16px] font-bold block">close</span>';
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
    // Re-run image validation after removal
    validateImages();
}

function addVariant() {
    const newRow = createVariantRow();
    variantList.appendChild(newRow);
    validateVariants(); // Run validation to ensure at least one variant is present
}

// Helper function to create a new variant row element
function createVariantRow() {
    const newRow = document.createElement("div");
    newRow.className =
        "variant-row grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-center";
    newRow.innerHTML = `
                <input
                    class="w-full bg-transparent border-[#e0e0e0] dark:border-primary/20 rounded-lg focus:ring-primary focus:border-primary text-sm"
                    placeholder='eg: 6" x 48"'
                    type="text"
                    name="size[]"
                    required
                />
                <input
                    class="w-full bg-transparent border-[#e0e0e0] dark:border-primary/20 rounded-lg focus:ring-primary focus:border-primary text-sm text-center"
                    placeholder="eg: 50"
                    type="number"
                    name="stock[]"
                    min="0"
                    required
                />
                <input
                    class="w-full bg-transparent border-[#e0e0e0] dark:border-primary/20 rounded-lg focus:ring-primary focus:border-primary text-sm text-center"
                    placeholder="eg: $5.99"
                    type="text"
                    name="price[]"
                    required
                    pattern="^\$?\d+(\.\d{2})?$"
                />
                <button
                    type="button"
                    onclick="this.parentElement.remove(); validateVariants();"
                    class="remove-variant p-2 text-[#757575] dark:text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-primary/30 rounded-full transition-colors"
                >
                    <span class="material-symbols-outlined text-xl">delete</span>
                </button>
            `;
    return newRow;
}

/* --- VALIDATION FUNCTIONS --- */

function toggleError(id, show, message = "") {
    const errorElement = document.getElementById(id);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.toggle("hidden", !show);
    }
}

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

function validateImages() {
    const fileCount = currentFiles.files.length;
    if (fileCount < 3) {
        toggleError("images-error", true, "You must upload at least 3 images.");
        return false;
    } else {
        toggleError("images-error", false);
        return true;
    }
}

function validateVariants() {
    const variantRows = document.querySelectorAll(".variant-row");
    let hasValidVariant = false;

    if (variantRows.length === 0) {
        toggleError(
            "variants-error",
            true,
            "At least one product variant (Size, Stock, Price) is required."
        );
        return false;
    }

    variantRows.forEach((row) => {
        const sizeInput = row.querySelector('input[name="size[]"]');
        const stockInput = row.querySelector('input[name="stock[]"]');
        const priceInput = row.querySelector('input[name="price[]"]');

        const isRowValid =
            sizeInput &&
            sizeInput.value.trim() !== "" &&
            stockInput &&
            stockInput.value.trim() !== "" &&
            stockInput.value >= 0 &&
            priceInput &&
            priceInput.value.trim() !== "" &&
            priceInput.value >= 0;

        if (isRowValid) {
            hasValidVariant = true;
        }
    });

    if (!hasValidVariant) {
        toggleError(
            "variants-error",
            true,
            "At least one complete product variant (Size, Stock, Price) is required."
        );
        return false;
    } else {
        toggleError("variants-error", false);
        return true;
    }
}

// 💥 UPDATED: Final form validation function using SweetAlert2
function validateForm() {
    const isInfoValid = validateProductInfo();
    const isImagesValid = validateImages();
    const isVariantsValid = validateVariants();

    let errorMessage = "Please correct the following issues:";
    let hasError = false;

    if (!isInfoValid) {
        errorMessage += "\n- Product Information missing or incomplete.";
        hasError = true;
    }
    if (!isImagesValid) {
        errorMessage += "\n- Minimum 3 product images are required.";
        hasError = true;
    }
    if (!isVariantsValid) {
        errorMessage +=
            "\n- At least one complete product variant is required.";
        hasError = true;
    }

    if (hasError) {
        // Use SweetAlert2 to display the error
        Swal.fire({
            icon: "error",
            title: "Validation Failed!",
            html: errorMessage.replace(/\n/g, "<br>"), // Replace newlines with <br> for HTML rendering
            confirmButtonText: "I understand",
            customClass: {
                confirmButton: "bg-primary hover:bg-primary/90", // Using your primary Tailwind class
            },
        });
        return false; // Prevent form submission
    }

    return true; // Allow form submission
}

// Initial check for listeners
document.addEventListener("DOMContentLoaded", () => {
    // Add event listeners for dynamic validation feedback
    document
        .getElementById("product-name")
        .addEventListener("input", validateProductInfo);
    document
        .getElementById("category")
        .addEventListener("change", validateProductInfo);
    document
        .getElementById("description")
        .addEventListener("input", validateProductInfo);

    // Initial variant validation on load
    validateVariants();
});
