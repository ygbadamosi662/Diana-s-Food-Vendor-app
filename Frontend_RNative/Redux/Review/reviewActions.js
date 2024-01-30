import { LOG_REVIEWS, LOG_REVIEW } from "./reviewTypes";

export const logReview = (payLoad={}) => {
    return {
        type: LOG_REVIEW,
        review: payLoad,
    }
}

export const logReviews = (payLoad=[]) => {
    return {
        type: LOG_REVIEWS,
        reviews: payLoad,
    }
}
