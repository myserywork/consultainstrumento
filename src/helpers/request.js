// request.js

import axios from 'axios';

class Request {
  constructor(baseURL) {
    this.axiosInstance = axios.create({
      baseURL,
    });
  }

  async get(endpoint, params = {}) {
    try {
      const response = await this.axiosInstance.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async post(endpoint, data = {}) {
    try {
      const response = await this.axiosInstance.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async put(endpoint, data = {}) {
    try {
      const response = await this.axiosInstance.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async delete(endpoint) {
    try {
      const response = await this.axiosInstance.delete(endpoint);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default Request;