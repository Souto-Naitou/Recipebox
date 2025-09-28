// UI更新関連の関数

// 全UIを更新
function updateAllUI() {
    try {
        console.log('=== Starting updateAllUI ===');
        console.log('Available recipes:', recipeDB.getAllRecipes().map(r => r.name));
        
        updateRecipeStats();
        console.log('Recipe stats updated');
        
        updateRecipeSelector();
        console.log('Recipe selector updated');
        
        // 材料選択ドロップダウンも更新
        if (typeof updateAllIngredientSelects === 'function') {
            updateAllIngredientSelects();
            console.log('Ingredient selects updated');
        }
        
        saveAllToLocalStorage();
        console.log('Data saved to localStorage');
        
        console.log('=== updateAllUI completed ===');
    } catch (error) {
        console.error('Error in updateAllUI:', error);
        showNotification(`UI更新エラー: ${error.message}`, 'error');
    }
}

// レシピセレクターを更新
function updateRecipeSelector() {
    try {
        let currentValue = '';
        
        // カスタムドロップダウンから現在の値を取得
        currentValue = getSelectValue('selectedRecipe');
        
        const recipesWithIngredients = recipeDB.getRecipesWithIngredients();
        
        // カスタムドロップダウンが存在する場合は更新
        console.log('=== updateRecipeSelector: Looking for custom dropdown ===');
        console.log('window.dropdownIntegration exists:', !!window.dropdownIntegration);
        console.log('dropdownIntegration exists:', typeof dropdownIntegration !== 'undefined');
        console.log('recipesWithIngredients:', recipesWithIngredients);
        
        const integration = window.dropdownIntegration || (typeof dropdownIntegration !== 'undefined' ? dropdownIntegration : null);
        if (integration) {
            console.log('Integration found, dropdowns count:', integration.dropdowns ? integration.dropdowns.size : 0);
            console.log('Available dropdown keys:', integration.dropdowns ? Array.from(integration.dropdowns.keys()) : []);
            
            const dropdown = integration.getDropdown ? integration.getDropdown('selectedRecipe') : null;
            console.log('selectedRecipe dropdown found:', !!dropdown);
            
            if (dropdown) {
                // オプション配列を作成
                const options = [
                    { value: '', text: 'レシピを選択してください', disabled: true }
                ];
                
                recipesWithIngredients.forEach(recipe => {
                    options.push({
                        value: recipe.name,
                        text: recipe.name,
                        icon: recipe.icon || 'fa-utensils'
                    });
                });
                
                console.log('Setting options for selectedRecipe:', options);
                
                // ドロップダウンのオプションを更新
                dropdown.setOptions(options);
                
                // 以前の選択値を復元
                if (currentValue && recipesWithIngredients.some(r => r.name === currentValue)) {
                    dropdown.setValue(currentValue);
                } else {
                    dropdown.setPlaceholder('レシピを選択してください');
                }
                
                console.log('selectedRecipe dropdown updated successfully');
            } else {
                console.warn('selectedRecipe dropdown not found');
            }
        } else {
            console.warn('No dropdown integration available');
        }
        
    } catch (error) {
        console.error('Error in updateRecipeSelector:', error);
    }
}

// レシピが選択されたときの処理
function onRecipeSelected() {
    try {
        // カスタムドロップダウンから選択されたレシピ名を取得
        const selectedRecipeName = getSelectValue('selectedRecipe');
        
        if (!selectedRecipeName) {
            clearCalculationResult();
            hideRecipeTree();
            return;
        }
        
        const recipe = recipeDB.getRecipe(selectedRecipeName);
        if (!recipe) return;
        
        // 計算結果をクリア
        clearCalculationResult();
        
        // レシピツリーを表示
        buildAndShowRecipeTree(selectedRecipeName);
        
        showNotification(`レシピ「${selectedRecipeName}」を選択しました`, 'success');
    } catch (error) {
        console.error('Error in onRecipeSelected:', error);
        showNotification('レシピ選択エラーが発生しました', 'error');
    }
}

// レシピツリーを構築して表示
function buildAndShowRecipeTree(recipeName) {
    const container = document.getElementById('recipeTreeContainer');
    const treeDiv = document.getElementById('recipeTree');
    
    if (!container || !treeDiv) return;
    
    try {
        // ツリーを構築
        const treeHTML = buildRecipeTreeHTML(recipeName, 0, new Set());
        treeDiv.innerHTML = treeHTML;
        
        // コンテナを表示
        container.style.display = 'block';
    } catch (error) {
        console.error('Error building recipe tree:', error);
        hideRecipeTree();
    }
}

// レシピツリーのHTMLを再帰的に構築
function buildRecipeTreeHTML(recipeName, depth = 0, visited = new Set()) {
    // 循環参照チェック
    if (visited.has(recipeName)) {
        return `<div class="tree-node error" style="margin-left: ${depth * 30}px;">
            <i class="fas fa-exclamation-triangle"></i>
            <span class="node-name">${recipeName} (循環参照)</span>
        </div>`;
    }
    
    const recipe = recipeDB.getRecipe(recipeName);
    if (!recipe) {
        return `<div class="tree-node error" style="margin-left: ${depth * 30}px;">
            <i class="fas fa-question-circle"></i>
            <span class="node-name">${recipeName} (見つかりません)</span>
        </div>`;
    }
    
    visited.add(recipeName);
    
    const icon = recipe.icon || 'fa-utensils';
    const nodeClass = recipe.type === 'basic' ? 'basic-ingredient' : 'recipe';
    
    let html = `<div class="tree-node ${nodeClass}" style="margin-left: ${depth * 30}px;">
        <div class="node-content">
            <i class="fas ${icon} node-icon"></i>
            <span class="node-name">${recipe.name}</span>
            <span class="node-type">(${recipe.type === 'basic' ? '基本材料' : 'レシピ'})</span>
        </div>`;
    
    // 材料がある場合は子ノードを追加
    if (recipe.ingredients && Object.keys(recipe.ingredients).length > 0) {
        html += '<div class="node-children">';
        for (const [ingredient, amount] of Object.entries(recipe.ingredients)) {
            html += `<div class="ingredient-amount" style="margin-left: ${(depth + 1) * 30}px;">
                <span class="amount-badge">${amount}</span>
            </div>`;
            html += buildRecipeTreeHTML(ingredient, depth + 1, new Set(visited));
        }
        html += '</div>';
    }
    
    html += '</div>';
    
    visited.delete(recipeName);
    return html;
}

// レシピツリーを非表示
function hideRecipeTree() {
    const container = document.getElementById('recipeTreeContainer');
    if (container) {
        container.style.display = 'none';
    }
}

// 計算結果をクリア
function clearCalculationResult() {
    const resultDiv = document.getElementById('calculationResult');
    if (resultDiv) {
        resultDiv.innerHTML = '';
    }
}



// レシピ統計を更新
function updateRecipeStats() {
    try {
        const recipeCountEl = document.getElementById('recipeCount');
        const basicItemCountEl = document.getElementById('basicItemCount');
        const maxCraftableEl = document.getElementById('maxCraftable');
        
        if (recipeCountEl) {
            const allRecipes = recipeDB.getAllRecipes();
            const recipeCount = allRecipes.filter(r => r.type === 'recipe').length;
            recipeCountEl.textContent = recipeCount;
        }
        
        if (basicItemCountEl) {
            const basicItems = recipeDB.getBasicItems();
            basicItemCountEl.textContent = basicItems.length;
        }
        
        // 最大作成可能数の表示は在庫機能削除により無効化
        if (maxCraftableEl) {
            maxCraftableEl.textContent = '-';
        }
    } catch (error) {
        console.error('Error in updateRecipeStats:', error);
    }
}

