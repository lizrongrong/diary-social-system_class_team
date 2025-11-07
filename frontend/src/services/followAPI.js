// Lightweight adapter: re-export followAPI from services/api for compatibility.
import { followAPI as _followAPI } from './api'

export const followAPI = _followAPI
export default _followAPI
