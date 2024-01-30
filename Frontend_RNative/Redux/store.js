import { configureStore } from "@reduxjs/toolkit"
import { rootReducer } from "./rootReducer";
/**
* Configures Redux store
* @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
*/

export const store = configureStore({reducer: rootReducer});
