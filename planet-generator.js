import * as THREE from 'three';

// Constants for CORS fallback
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

// Generate a planet description using the LLM
export async function generatePlanetDescription(seed) {
  try {
    const prompt = seed ? 
      `Create a detailed description of a fictional planet named ${seed}. Include information about its atmosphere, terrain, any notable features, potential life forms, and its place in its solar system.` :
      'Create a detailed description of a fictional planet. Include a creative name, information about its atmosphere, terrain, any notable features, potential life forms, and its place in its solar system.';
    
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a planetary scientist and creative writer. Generate detailed, scientifically plausible descriptions of fictional planets. 
          Be imaginative but maintain scientific credibility. Include a unique name for the planet if not provided.
          Respond directly with JSON, following this schema, and no other text:
          {
            "name": "Planet name",
            "description": "Full detailed description of the planet",
            "summary": "A short 1-2 sentence summary of the planet's key features"
          }`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      json: true
    });

    return JSON.parse(completion.content);
  } catch (error) {
    console.error('Error generating planet description:', error);
    throw error;
  }
}

// Generate a planet texture image using the LLM
export async function generatePlanetImage(planetDescription) {
  try {
    const imagePrompt = `A detailed, realistic space photo of planet ${planetDescription.name}. ${planetDescription.summary}. The image should look like a NASA photograph showing the planet's unique features from space.`;
    
    const result = await websim.imageGen({
      prompt: imagePrompt,
      aspect_ratio: "1:1"
    });
    
    return result.url;
  } catch (error) {
    console.error('Error generating planet image:', error);
    throw error;
  }
}

// Load texture with CORS fallback
export async function loadTextureWithFallback(imageUrl) {
  const textureLoader = new THREE.TextureLoader();
  
  // Try loading the image directly first
  try {
    return await new Promise((resolve, reject) => {
      textureLoader.load(
        imageUrl,
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
  } catch (error) {
    console.warn('Direct texture loading failed, attempting CORS proxy:', error);
    
    // If direct loading fails, try with CORS proxy
    try {
      return await new Promise((resolve, reject) => {
        textureLoader.load(
          `${CORS_PROXY}${imageUrl}`,
          (texture) => resolve(texture),
          undefined,
          (proxyError) => reject(proxyError)
        );
      });
    } catch (proxyError) {
      console.error('Texture loading failed even with CORS proxy:', proxyError);
      throw proxyError;
    }
  }
}

// Create a complete planet record for the database
export async function createPlanetRecord(planetData) {
  try {
    const planetRecord = await room.collection('planet').create({
      name: planetData.name,
      description: planetData.description,
      summary: planetData.summary,
      imageUrl: planetData.imageUrl
    });
    
    return planetRecord;
  } catch (error) {
    console.error('Error creating planet record:', error);
    throw error;
  }
}

