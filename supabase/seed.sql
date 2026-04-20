-- ============================================
-- ReefCams Seed Data
-- Run AFTER schema.sql
-- Uses youtube-nocookie.com for better embed compatibility
-- ============================================

insert into reefcams_catalog (name, youtube_url, category, thumbnail_url, is_active)
values
  (
    'Coral Reef Cam',
    'https://www.youtube-nocookie.com/embed/1zcIUk66HX4?autoplay=1&mute=1',
    'Coral Reef',
    'https://img.youtube.com/vi/1zcIUk66HX4/hqdefault.jpg',
    true
  ),
  (
    'Jellyfish Cam',
    'https://www.youtube-nocookie.com/embed/NUnJc82ptd4?autoplay=1&mute=1',
    'Ocean',
    'https://img.youtube.com/vi/NUnJc82ptd4/hqdefault.jpg',
    true
  ),
  (
    'Elephant Cam',
    'https://www.youtube-nocookie.com/embed/0P_LBKqVbfs?autoplay=1&mute=1',
    'Elephants',
    'https://img.youtube.com/vi/0P_LBKqVbfs/hqdefault.jpg',
    true
  ),
  (
    'Eagle Cam',
    'https://www.youtube-nocookie.com/embed/IVmL3diwJuw?autoplay=1&mute=1',
    'Birds',
    'https://img.youtube.com/vi/IVmL3diwJuw/hqdefault.jpg',
    true
  ),
  (
    'Giraffe Cam',
    'https://www.youtube-nocookie.com/embed/xXZqU5vnEug?autoplay=1&mute=1',
    'Safari',
    'https://img.youtube.com/vi/xXZqU5vnEug/hqdefault.jpg',
    true
  ),
  (
    'Jungle Stream Cam',
    'https://www.youtube-nocookie.com/embed/F0GOOP82094?autoplay=1&mute=1',
    'Jungle',
    'https://img.youtube.com/vi/F0GOOP82094/hqdefault.jpg',
    true
  );
