import { LOG_RECIPES, LOG_RECIPE } from "./recipeTypes";

const initState = {
    recipes: [],
    recipe: {}
}

export const recipeReducer = (state = initState, action) => {
    switch (action.type) {
        case LOG_RECIPES: return {
            ...state,
            recipes: action.recipes
        }

        case LOG_RECIPE: return {
            ...state,
            recipe: action.recipe
        }
        
        default: return state
    }
}
