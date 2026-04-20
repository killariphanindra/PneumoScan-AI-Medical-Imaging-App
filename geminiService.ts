
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION, DIAGNOSIS_PROMPT } from "../constants";
import { DiagnosisResult, DiagnosisStatus } from "../types";

export const analyzeMedicalImage = async (base64Image: string, mimeType: string): Promise<DiagnosisResult> => {
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('No image data provided to analyzeMedicalImage.');
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error('Missing API_KEY in environment. Set process.env.API_KEY to your GenAI key.');
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image.split(',')[1] // Remove the prefix
          }
        },
        { text: DIAGNOSIS_PROMPT }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { 
            type: Type.STRING, 
            description: "Classification: Normal, Diseased, or Inconclusive. Based on Kaggle Mooney standard." 
          },
          confidence: { 
            type: Type.NUMBER, 
            description: "Confidence score (0.0 to 1.0) for the prediction." 
          },
          findings: { 
            type: Type.STRING, 
            description: "Pathological findings grounded in thoracic radiology terms (e.g. consolidation, interstitial pattern)." 
          },
          recommendation: { 
            type: Type.STRING, 
            description: "Suggested clinical follow-up (e.g. Sputum culture, CT confirmation)." 
          },
          detectedAnomalies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Specific visual cues identified in the lung parenchyma."
          },
          metrics: {
            type: Type.OBJECT,
            properties: {
              accuracy: { type: Type.NUMBER, description: "Historical accuracy for this specific pattern." },
              precision: { type: Type.NUMBER },
              recall: { type: Type.NUMBER },
              f1Score: { type: Type.NUMBER }
            },
            required: ["accuracy", "precision", "recall", "f1Score"]
          }
        },
        required: ["status", "confidence", "findings", "recommendation", "detectedAnomalies", "metrics"]
      }
    }
  });
  // The SDK may return different shapes depending on version. Try several strategies
  // to extract the JSON string that contains the diagnosis result.
  const tryParse = (raw: any): DiagnosisResult => {
    // If it's already an object that matches DiagnosisResult, return it
    if (raw && typeof raw === 'object') {
      if (raw.status && raw.metrics && typeof raw.confidence === 'number') {
        return raw as DiagnosisResult;
      }
    }

    // If it's a string, attempt JSON.parse
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.startsWith('{')) {
        return JSON.parse(trimmed) as DiagnosisResult;
      }
    }

    throw new Error('Could not parse diagnosis result from raw response.');
  };

  try {
    // Preferred: some SDKs expose `text`
    const text = (response as any).text;
    if (text) {
      return tryParse(text);
    }

    // Some SDKs return a structured `output` array with content parts
    const output = (response as any).output || (response as any).outputs || (response as any).response;
    if (Array.isArray(output) && output.length > 0) {
      // look for a content entry that is a string or an object
      for (const out of output) {
        // content may be under .content or .data
        const contents = out.content || out.contents || out;
        if (Array.isArray(contents)) {
          for (const c of contents) {
            if (typeof c === 'string') {
              try { return tryParse(c); } catch (e) { /* continue */ }
            }
            // some content pieces carry .text or .payload
            if (c && typeof c === 'object') {
              if (typeof c.text === 'string') {
                try { return tryParse(c.text); } catch (e) { /* continue */ }
              }
              if (typeof c.payload === 'string') {
                try { return tryParse(c.payload); } catch (e) { /* continue */ }
              }
              // some parts could be JSON already
              try { return tryParse(c); } catch (e) { /* continue */ }
            }
          }
        } else if (typeof contents === 'string') {
          try { return tryParse(contents); } catch (e) { /* continue */ }
        } else if (typeof out === 'string') {
          try { return tryParse(out); } catch (e) { /* continue */ }
        } else if (typeof out === 'object') {
          try { return tryParse(out); } catch (e) { /* continue */ }
        }
      }
    }

    // Fallback: try to stringify and find a JSON substring
    const dumped = JSON.stringify(response);
    const firstBrace = dumped.indexOf('{');
    if (firstBrace >= 0) {
      const candidate = dumped.slice(firstBrace);
      try { return JSON.parse(candidate) as DiagnosisResult; } catch (e) { /* fall through */ }
    }

    throw new Error('Empty or unrecognized response from AI engine.');
  } catch (error) {
    console.error('Failed to parse AI response:', error, '\nFull response:', response);
    throw new Error('Invalid diagnostic response from AI service. See console for details.');
  }
};
