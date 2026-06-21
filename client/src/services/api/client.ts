import axios from 'axios';
import { getApiBaseUrl } from '../../config/env';

const apiBaseUrl = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});
