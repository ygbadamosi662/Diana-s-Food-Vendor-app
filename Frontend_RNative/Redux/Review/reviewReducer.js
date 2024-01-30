import { LOG_REVIEWS, LOG_REVIEW } from "./reviewTypes";

const initState = {
    review: {},
    reviews: []
}

export const reviewReducer = (state = initState, action) => {
    switch (action.type) {
        case LOG_REVIEW: return {
            ...state,
            review: action.review
        }

        case LOG_REVIEWS: return {
            ...state,
            reviews: action.reviews
        }

        default: return state
    }
}
