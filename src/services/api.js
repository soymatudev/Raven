import { loadServerUrl } from '../utils/storage';

const getBaseUrl = async () => {
  const url = await loadServerUrl();
  if (!url) {
    throw new Error('La dirección del servidor no está configurada.');
  }
  // En caso de que el usuario olvide el slash final o lo ponga de más
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

export const apiRequest = async (endpoint, options = {}) => {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return response;
};

export const testConnection = async (tempUrl) => {
  let baseUrl = tempUrl;
  if (!baseUrl) {
    try {
      baseUrl = await getBaseUrl();
    } catch (e) {
      return false;
    }
  } else {
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de margen

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.status === 200;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Connection test failed:', error.message);
    return false;
  }
};

export const verificarEmpleado = async (clave) => {
  try {
    const response = await apiRequest(`/empleados/${clave}`, {
      method: 'GET'
    });

    if (response.status === 200) {
      const data = await response.json();
      return data; // Se espera { cve_emple, descri, depto, ... }
    }
    return null;
  } catch (error) {
    console.error('Error verificando empleado:', error.message);
    throw error;
  }
};

export const uploadEvidencias = async (fileUris) => {
  if (!fileUris || fileUris.length === 0) return [];
  
  try {
    const formData = new FormData();
    
    fileUris.forEach((uri) => {
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      const isPdf = filename.toLowerCase().endsWith('.pdf');
      
      formData.append('files', {
        uri: uri,
        name: filename,
        type: isPdf ? 'application/pdf' : type,
      });
    });

    const response = await apiRequest('/viajes/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.status === 200 || response.status === 201) {
      const data = await response.json();
      return data.urls; // Se espera { ok: true, urls: ['https://...', ...] }
    }
    
    const errorText = await response.text();
    throw new Error(`Fallo al subir archivos: ${errorText}`);
  } catch (error) {
    console.error('Error uploading evidences:', error.message);
    throw error;
  }
};

export const syncViaje = async (viajeData) => {
  try {
    const response = await apiRequest('/viajes', {
      method: 'POST',
      body: JSON.stringify(viajeData),
    });

    if (response.status === 200 || response.status === 201) {
      return await response.json();
    }
    
    const errorText = await response.text();
    throw new Error(`Error en sincronización: ${errorText}`);
  } catch (error) {
    console.error('Error syncing trip:', error.message);
    throw error;
  }
};

export const obtenerCategorias = async () => {
  try {
    const response = await apiRequest('/viajes/categorias', {
      method: 'GET'
    });

    if (response.status === 200) {
      const data = await response.json();
      return data; // Se espera [{ cve_catvj, nombre, icon }, ...]
    }
    return [];
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    return [];
  }
};

export const getViajeById = async (id) => {
  try {
    const numericId = Number(id);
    const response = await apiRequest(`/viajes/${numericId}`, {
      method: 'GET'
    });

    if (response.status === 200) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error fetching trip by ID:', error.message);
    throw error;
  }
};
