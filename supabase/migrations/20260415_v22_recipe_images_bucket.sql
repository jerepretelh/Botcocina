-- v22: Setup Storage Bucket for Recipe Images
-- Create the new bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public reads from the bucket
CREATE POLICY "Public Access for recipe-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recipe-images');

-- Policy to allow anonymous uploads to the bucket
-- Note: Fixed Runtime has mostly anon usage; adjust 'TO anon' or 'TO authenticated' as needed.
CREATE POLICY "Anon/Auth Upload for recipe-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'recipe-images');
