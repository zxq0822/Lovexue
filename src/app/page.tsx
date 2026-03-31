'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Camera, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

type Photo = {
  id: string;
  created_at: string;
  title: string | null;
  image_url: string;
};

type Video = {
  id: string;
  src: string;
  title: string | null;
};

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // Video Carousel State
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (videos.length <= 1) return;
    // 自动轮播定时器
    const timer = setInterval(() => {
      setCurrentVideoIdx((prev) => (prev + 1) % videos.length);
    }, 8000); // 每8秒切换一次视频
    return () => clearInterval(timer);
  }, [videos.length]);

  const nextVideo = () => {
    if (videos.length <= 1) return;
    setCurrentVideoIdx((prev) => (prev + 1) % videos.length);
  };

  const prevVideo = () => {
    if (videos.length <= 1) return;
    setCurrentVideoIdx((prev) => (prev === 0 ? videos.length - 1 : prev - 1));
  };

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch photos
      const { data: photosData, error: photosError } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;
      if (photosData) setPhotos(photosData);

      // Fetch videos
      const { data: videosData, error: videosError } = await supabase
        .from('hero_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;
      if (videosData) setVideos(videosData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* 顶部视频轮播模块 */}
      <section className="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] bg-black overflow-hidden shadow-2xl">
        {videos.length > 0 ? (
          <>
            {videos.map((vid, idx) => (
              <div
                key={vid.id}
                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${idx === currentVideoIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
              >
                <video
                  src={vid.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover opacity-80"
                  style={{ pointerEvents: 'none' }}
                />
                {/* 渐变遮罩与文字 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-10 md:p-20">
                  <div className={`transition-all duration-700 transform ${idx === currentVideoIdx ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight shadow-sm drop-shadow-md">
                      {vid.title}
                    </h2>
                    <p className="text-zinc-200 text-lg md:text-xl font-light">探索美丽的瞬间与流动的故事</p>
                  </div>
                </div>
              </div>
            ))}

            {videos.length > 1 && (
              <>
                <button
                  onClick={prevVideo}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-sm transition-all shadow-lg"
                  aria-label="Previous Video"
                >
                  <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
                </button>
                <button
                  onClick={nextVideo}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-sm transition-all shadow-lg"
                  aria-label="Next Video"
                >
                  <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
                </button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                  {videos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentVideoIdx(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${idx === currentVideoIdx ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
            {loading ? '加载视频中...' : '暂无轮播视频展示'}
          </div>
        )}
      </section>

      {/* 照片瀑布流区域 */}
      <div className="max-w-7xl mx-auto w-full px-6 py-12 md:py-16 flex-grow">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 pb-6 border-b border-gray-200 dark:border-zinc-800 gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Camera className="w-8 h-8 text-blue-500" />
              LoveXue
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">记录我爱杨瑞雪的每一个瞬间</p>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-zinc-400">
            <p className="text-xl">暂无照片</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative aspect-square bg-gray-200 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <img
                  src={photo.image_url}
                  alt={photo.title || 'Photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
