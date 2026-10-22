// Öğretmenin ödeve eklediği foto/video: galeriden ya da kameradan seç → Supabase Storage ('homework-media').
// Yol: <sunucudaki sınıf id>/<rastgele>/<dosya>. Yalnızca sınıfın öğretmeni yükleyebilir (RLS); öğrenci dosya yükleyemez.
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { shortId } from '../utils/codec';

const BUCKET = 'homework-media';
export const MAX_BYTES = 50 * 1024 * 1024; // Supabase ücretsiz planda dosya başına üst sınır

// source: 'library' | 'camera'. Döner: [{ uri, type: 'image'|'video', name, mime, size }] (iptalde boş).
export async function pickMedia(source = 'library') {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? 'Kamera izni verilmedi.' : 'Galeri izni verilmedi.');
  const opts = {
    mediaTypes: ['images', 'videos'],
    quality: 0.7,
    videoMaxDuration: 120,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    allowsMultipleSelection: source !== 'camera',
    selectionLimit: 5,
  };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled) return [];
  return res.assets.map((a, i) => {
    const type = a.type === 'video' ? 'video' : 'image';
    const ext = (a.fileName && a.fileName.split('.').pop()) || (type === 'video' ? 'mp4' : 'jpg');
    return {
      uri: a.uri,
      type,
      name: a.fileName || `${type === 'video' ? 'video' : 'foto'}-${i + 1}.${ext}`,
      mime: a.mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: a.fileSize || null,
    };
  });
}

// Tek dosyayı yükle. Döner: { path, url, type, name }.
export async function uploadMedia(classRid, item) {
  if (!classRid) throw new Error('Sınıf henüz sunucuya eşitlenmedi; birazdan tekrar dene.');
  if (item.size && item.size > MAX_BYTES) throw new Error(`"${item.name}" 50 MB'tan büyük. Daha kısa bir video seç.`);
  const body = await (await fetch(item.uri)).arrayBuffer();
  if (body.byteLength > MAX_BYTES) throw new Error(`"${item.name}" 50 MB'tan büyük. Daha kısa bir video seç.`);
  const safe = item.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-60);
  const path = `${classRid}/${shortId()}${shortId()}/${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: item.mime, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl, type: item.type, name: item.name };
}

export const removeMedia = (paths) => (paths.length ? supabase.storage.from(BUCKET).remove(paths) : Promise.resolve());
