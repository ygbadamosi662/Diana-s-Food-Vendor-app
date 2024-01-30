import axios from 'axios';
import { Local_Storage } from './enum_ish';
import { getItem } from './services/local_storage_service';
/**
* Axios configuration
* @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
*/
const appAx = axios.create({
  baseURL: 'http://127.0.0.1:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

appAx.defaults.headers.common['Access-Control-Allow-Origin'] = 'http://127.0.0.1:1245';

const setAuthHeader = () => {
  const token = getItem(Local_Storage.access_token);
  if(token) {
    if(appAx.defaults.headers.common['Authorization'] === `Bearer ${token}`) {
      return;
    }
    appAx.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return;
  }
  return null;
};

export { appAx, setAuthHeader };
