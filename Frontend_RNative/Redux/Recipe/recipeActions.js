import { LOG_RECIPES, LOG_RECIPE } from "./recipeTypes";

export const logRecipes = (payload = []) => {
    return {
        type: LOG_RECIPES,
        recipes: payload
    }
}

export const logRecipe = (payload = {}) => {
    return {
        type: LOG_RECIPE,
        recipe: payload
    }
}
