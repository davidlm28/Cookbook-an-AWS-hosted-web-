// Script Mejorado del Directorio de Recetas
const API_BASE_URL = 'https://xrtrpxbe76.execute-api.us-east-1.amazonaws.com/dev';

// Estado global
let currentRecipes = [];
let isEditMode = false;

// Funciones de utilidad
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

function updateRecipesCount(count) {
    const recipesCountElement = document.getElementById('recipesCount');
    if (recipesCountElement) {
        recipesCountElement.textContent = `${count} ${count === 1 ? 'receta' : 'recetas'}`;
    }
}

function formatIngredients(ingredients) {
    return ingredients.split(',').map(ingredient => ingredient.trim()).join(' • ');
}

function truncateText(text, maxLength = 150) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

// Funciones de la API
async function fetchRecipes() {
    const recipeList = document.getElementById('recipeList');
    if (!recipeList) return; // Solo se ejecuta en index.html

    try {
        recipeList.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                Cargando recetas...
            </div>
        `;
        
        const response = await fetch(`${API_BASE_URL}/recetas`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
            throw new Error(`Error HTTP! estado: ${response.status}, mensaje: ${errorData.message || 'Sin mensaje de error específico.'}`);
        }
        
        const apiResponse = await response.json();
        const recipes = JSON.parse(apiResponse.body);
        
        currentRecipes = recipes;
        displayRecipes(recipes);
        updateRecipesCount(recipes.length);
        
    } catch (error) {
        console.error('Error al obtener recetas:', error);
        showNotification('Fallo al cargar recetas. Por favor, inténtalo de nuevo.', 'error');
        recipeList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error al cargar recetas</h3>
                <p>Por favor, actualiza la página e inténtalo de nuevo.</p>
            </div>
        `;
    }
}

async function addRecipe(recipe) {
    try {
        const response = await fetch(`${API_BASE_URL}/recetas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipe)
        });
        
        if (response.status === 202) {
            showNotification('¡Receta enviada con éxito! Redirigiendo a la lista de recetas...', 'success');
            resetForm();
            setTimeout(() => { window.location.href = 'index.html'; }, 2000); // Redirigir después del éxito
        } else {
            const errorData = await response.json();
            throw new Error(`Error HTTP! estado: ${response.status}, mensaje: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error al añadir receta:', error);
        showNotification(`Fallo al añadir receta. Error: ${error.message}`, 'error');
    }
}

async function updateRecipe(recipe) {
    try {
        const response = await fetch(`${API_BASE_URL}/recetas/${recipe.idReceta}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipe)
        });
        
        if (response.status === 202) {
            showNotification('¡Receta actualizada con éxito! Los cambios aparecerán en breve.', 'success');
            resetForm();
            setTimeout(() => { window.location.href = 'index.html'; }, 2000); // Redirigir después del éxito
        } else {
            const errorData = await response.json();
            throw new Error(`Error HTTP! estado: ${response.status}, mensaje: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error al actualizar receta:', error);
        showNotification(`Fallo al actualizar receta. Error: ${error.message}`, 'error');
    }
}

async function deleteRecipe(idReceta) {
    const recipeName = currentRecipes.find(r => r.idReceta === idReceta)?.Nombre || 'esta receta';
    if (!confirm(`¿Estás seguro de que quieres eliminar "${recipeName}"? Esta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/recetas/${idReceta}`, {
            method: 'DELETE'
        });

        if (response.status === 204 || response.ok) {
            showNotification('¡Receta eliminada con éxito!', 'success');
            fetchRecipes(); // Volver a cargar las recetas para la página actual
        } else {
            let errorMessage = `Error HTTP! estado: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    errorMessage += `, mensaje: ${errorData.message}`;
                }
            } catch (e) {
                console.warn('Respuesta de error pero no se pudo analizar el cuerpo JSON:', e);
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Error al eliminar receta:', error);
        showNotification(`Fallo al eliminar receta. Error: ${error.message}`, 'error');
    }
}

// Funciones de UI para la Página de Lista de Recetas (index.html)
function displayRecipes(recipes) {
    const recipeList = document.getElementById('recipeList');
    if (!recipeList) return; // Asegúrate de que esto solo se ejecute en la página de lista de recetas

    if (recipes.length === 0) {
        recipeList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <h3>No se encontraron recetas</h3>
                <p>¡Empieza añadiendo tu primera y deliciosa receta!</p>
                <a href="add-recipe.html" class="btn-primary" style="margin-top: 20px;">
                    <i class="fas fa-plus-circle"></i> Añadir Receta
                </a>
            </div>
        `;
        return;
    }

    const recipesHTML = recipes.map(recipe => `
        <div class="recipe-card">
            <div class="recipe-header">
                <h3>${recipe.Nombre}</h3>
            </div>
            <div class="recipe-body">
                <div class="recipe-section">
                    <h4>
                        <i class="fas fa-list-ul"></i>
                        Ingredientes
                    </h4>
                    <p>${formatIngredients(recipe.Ingredientes)}</p>
                </div>
                <div class="recipe-section">
                    <h4>
                        <i class="fas fa-clipboard-list"></i>
                        Instrucciones
                    </h4>
                    <p>${truncateText(recipe.Instrucciones)}</p>
                </div>
            </div>
            <div class="recipe-actions">
                <button class="edit-button" data-id="${recipe.idReceta}">
                    <i class="fas fa-edit"></i>
                    Editar
                </button>
                <button class="delete-button" data-id="${recipe.idReceta}">
                    <i class="fas fa-trash"></i>
                    Eliminar
                </button>
            </div>
        </div>
    `).join('');

    recipeList.innerHTML = recipesHTML;

    // Añadir listeners de eventos para editar/eliminar en la página de lista de recetas
    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const idReceta = e.target.closest('.edit-button').dataset.id;
            // Redirigir a add-recipe.html con idReceta como parámetro de consulta
            window.location.href = `add-recipe.html?id=${idReceta}`;
        });
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const idReceta = e.target.closest('.delete-button').dataset.id;
            deleteRecipe(idReceta);
        });
    });
}

// Funciones de UI para la Página de Añadir/Editar Recetas (add-recipe.html)
let idRecetaInput, NombreInput, IngredientesInput, InstruccionesInput, submitButton, cancelEditButton, recipeForm, formTitle;

function initializeFormElements() {
    idRecetaInput = document.getElementById('idReceta');
    NombreInput = document.getElementById('Nombre');
    IngredientesInput = document.getElementById('Ingredientes');
    InstruccionesInput = document.getElementById('Instrucciones');
    submitButton = document.getElementById('submitButton');
    cancelEditButton = document.getElementById('cancelEditButton');
    recipeForm = document.getElementById('recipeForm');
    formTitle = document.getElementById('formTitle');

    if (recipeForm) {
        recipeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const recipe = {
                Nombre: NombreInput.value.trim(),
                Ingredientes: IngredientesInput.value.trim(),
                Instrucciones: InstruccionesInput.value.trim()
            };
            
            if (!recipe.Nombre || !recipe.Ingredientes || !recipe.Instrucciones) {
                showNotification('Por favor, rellena todos los campos', 'error');
                return;
            }
            
            const formElements = recipeForm.querySelectorAll('input, textarea, button');
            formElements.forEach(el => el.disabled = true);
            
            try {
                if (idRecetaInput.value) {
                    recipe.idReceta = idRecetaInput.value;
                    await updateRecipe(recipe);
                } else {
                    await addRecipe(recipe);
                }
            } finally {
                formElements.forEach(el => el.disabled = false);
            }
        });

        cancelEditButton.addEventListener('click', () => {
            resetForm();
            showNotification('Edición cancelada', 'info');
            // Opcionalmente, redirigir a index.html si está en la página de edición
            if (isEditMode) {
                window.location.href = 'index.html';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isEditMode) {
                resetForm();
                if (window.location.pathname.includes('add-recipe.html')) {
                    window.location.href = 'index.html';
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && 
                document.activeElement && 
                recipeForm.contains(document.activeElement)) {
                e.preventDefault();
                recipeForm.dispatchEvent(new Event('submit'));
            }
        });

        // Comprobar la ID de la receta en la URL para editar
        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('id');
        if (recipeId) {
            loadRecipeForEdit(recipeId);
        } else {
            resetForm(); // Asegurarse de que el formulario esté en modo 'añadir' si no hay ID
        }
    }
}

async function loadRecipeForEdit(idReceta) {
    try {
        const response = await fetch(`${API_BASE_URL}/recetas`);
        if (!response.ok) {
            throw new Error(`Error HTTP! estado: ${response.status}`);
        }
        const apiResponse = await response.json();
        const allRecipes = JSON.parse(apiResponse.body);
        const recipeToEdit = allRecipes.find(r => r.idReceta === idReceta);

        if (recipeToEdit) {
            idRecetaInput.value = recipeToEdit.idReceta;
            NombreInput.value = recipeToEdit.Nombre;
            IngredientesInput.value = recipeToEdit.Ingredientes;
            InstruccionesInput.value = recipeToEdit.Instrucciones;
            
            isEditMode = true;
            formTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Receta';
            submitButton.innerHTML = '<i class="fas fa-save"></i> Actualizar Receta';
            cancelEditButton.style.display = 'inline-flex';
            
            NombreInput.focus();
            showNotification('Receta cargada para editar', 'info');
        } else {
            showNotification('Receta no encontrada para editar.', 'error');
            // Redirigir a la página add-recipe sin ID si la receta no se encuentra
            history.replaceState(null, '', 'add-recipe.html');
            resetForm();
        }
    } catch (error) {
        console.error('Error al cargar receta para editar:', error);
        showNotification('Fallo al cargar receta para editar. Por favor, inténtalo de nuevo.', 'error');
        // Redirigir a la página add-recipe sin ID en caso de error
        history.replaceState(null, '', 'add-recipe.html');
        resetForm();
    }
}

function resetForm() {
    if (recipeForm) {
        recipeForm.reset();
        idRecetaInput.value = '';
        isEditMode = false;
        formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Añadir Nueva Receta';
        submitButton.innerHTML = '<i class="fas fa-save"></i> Añadir Receta';
        cancelEditButton.style.display = 'none';
    }
}

// Inicializar según la página actual
document.addEventListener('DOMContentLoaded', () => {
    // Añadir CSS para la animación de notificaciones
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .hero-button {
            margin-top: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.8rem 1.8rem;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .hero-button.btn-primary {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: white;
        }
        .hero-button.btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);
        }
        .hero-button.btn-secondary {
            background: linear-gradient(135deg, #e67e22, #d35400);
            color: white;
        }
        .hero-button.btn-secondary:hover {
            transform: translateY(-3px);
            background: linear-gradient(135deg, #d35400, #c0392b);
        }
    `;
    document.head.appendChild(style);

    if (window.location.pathname.includes('add-recipe.html')) {
        initializeFormElements();
    } else {
        fetchRecipes(); // Esto se ejecutará en index.html
    }
});