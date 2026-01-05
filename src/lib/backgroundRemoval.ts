import { supabase } from "@/integrations/supabase/client";

export async function removeBackground(imageUrl: string): Promise<string> {
  try {
    console.log('Calling remove-background edge function for:', imageUrl);
    
    const { data, error } = await supabase.functions.invoke('remove-background', {
      body: { imageUrl }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to remove background');
    }

    if (!data?.processedImageUrl) {
      throw new Error('No processed image returned');
    }

    console.log('Background removal complete');
    return data.processedImageUrl;
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
}
