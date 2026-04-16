import imageCompression from 'browser-image-compression';
import { supabaseClient } from './supabaseClient';

export async function uploadRecipeCover(file: File, recipeId: string): Promise<string> {
  if (!supabaseClient) {
    throw new Error("Supabase client is not initialized.");
  }

  // 1. Opciones de compresión
  // Restringimos bastante el tamaño máximo ya que es para recetarios web
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  };

  try {
    // 2. Comprimir la imagen localmente
    const compressedFile = await imageCompression(file, options);
    
    // Generar un nombre único (ej. mi-receta-uuid_17300000.jpg)
    const ext = compressedFile.name.split('.').pop() || 'jpg';
    const filePath = `${recipeId}_${Date.now()}.${ext}`;

    // 3. Subir el archivo al bucket "recipe-images"
    const { error: uploadError } = await supabaseClient.storage
      .from('recipe-images')
      .upload(filePath, compressedFile);

    if (uploadError) {
      throw uploadError;
    }

    // 4. Obtener URL pública
    const { data } = supabaseClient.storage
      .from('recipe-images')
      .getPublicUrl(filePath);

    return data.publicUrl;

  } catch (error) {
    console.error("Error al comprimir/subir imagen:", error);
    throw error;
  }
}
