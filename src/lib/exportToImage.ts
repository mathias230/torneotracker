
"use client";
import html2canvas from 'html2canvas';
import { toast } from "@/hooks/use-toast";

export const exportElementAsImage = async (element: HTMLElement, fileName: string, options?: Partial<html2canvas.Options>) => {
  if (!element) {
    toast({
      title: "Error al Exportar",
      description: "No se encontró el elemento para capturar la imagen.",
      variant: "destructive",
    });
    console.error('Element to capture is null or undefined');
    return;
  }
  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Improve resolution
      useCORS: true,
      logging: false,
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background').trim() || '#ffffff', // Use theme background
      ...options,
    });
    const image = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    const safeFileName = fileName.replace(/[^a-z0-9áéíóúñü\s]/gi, '_').replace(/\s+/g, '_').toLowerCase();
    link.download = `${safeFileName}.png`;
    link.href = image;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link); // Clean up
     toast({
      title: "Imagen Exportada",
      description: `La imagen "${safeFileName}.png" se ha descargado.`,
    });
  } catch (error) {
    console.error('Error capturing element as image:', error);
    toast({
      title: "Error al Exportar",
      description: "Ocurrió un problema al generar la imagen. Revisa la consola para más detalles.",
      variant: "destructive",
    });
  }
};

// Helper to get current theme's actual background color for html2canvas
// This might need to be more robust if you have complex nested backgrounds
const getThemeBackgroundColor = () => {
  if (typeof window === 'undefined') return '#ffffff'; // Default for SSR or non-browser env

  // Attempt to get the actual background color of the body or a relevant container
  // This respects ShadCN CSS variables
  const bodyBgColor = getComputedStyle(document.body).backgroundColor;
  if (bodyBgColor && bodyBgColor !== 'rgba(0, 0, 0, 0)' && bodyBgColor !== 'transparent') {
    return bodyBgColor;
  }
  // Fallback using the CSS variable directly (might not be fully computed if not on body)
  const themeBg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  if (themeBg) {
    // HSL values need to be converted to a usable color string like #RRGGBB or rgb()
    // For simplicity, if it's HSL, we'll use a default. A proper HSL to RGB/HEX is needed for full accuracy.
    // This is a basic check, a full HSL parser/converter is more complex.
    if (themeBg.includes(' ') && !themeBg.startsWith('rgb')) { // Likely HSL
        // Check if dark mode is active to provide a sensible default
        if(document.documentElement.classList.contains('dark')) {
            return '#1a202c'; // A common dark background
        }
        return '#ffffff'; // Default light background
    }
    return themeBg;
  }
  return '#ffffff'; // Final fallback
}

export const exportElementAsImageWithTheme = async (element: HTMLElement, fileName: string, options?: Partial<html2canvas.Options>) => {
  const backgroundColor = getThemeBackgroundColor();
  await exportElementAsImage(element, fileName, { backgroundColor, ...options });
};

