'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UploadCloud, Trash2, Camera, Video, LogOut } from 'lucide-react';
import Link from 'next/link';

type Photo = {
  id: string;
  created_at: string;
  title: string | null;
  image_url: string;
};

type HeroVideo = {
  id: string;
  created_at: string;
  title: string | null;
  src: string;
};

export default function AdminPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [videos, setVideos] = useState<HeroVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('qing_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    // 适配手机端输入法可能自带的大写和空格
    if (password.trim().toLowerCase() === 'qing') {
      setIsAuthenticated(true);
      localStorage.setItem('qing_auth', 'true');
    } else {
      setErrorMsg('密码错误，请重新输入');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('qing_auth');
    setPassword('');
  };

  async function fetchData() {
    try {
      setLoading(true);

      const { data: photosData, error: photosError } = await supabase
        .from('images')
        .select('*')
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;
      if (photosData) setPhotos(photosData);

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

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const bucketName = activeTab === 'photos' ? 'photos' : 'videos';

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // 3. Save to Database
      if (activeTab === 'photos') {
        const { error: dbError } = await supabase
          .from('images')
          .insert([{ title: file.name, image_url: data.publicUrl }]);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('hero_videos')
          .insert([{ title: file.name, src: data.publicUrl }]);
        if (dbError) throw dbError;
      }

      await fetchData();
      alert('上传成功!');
    } catch (error: any) {
      alert('上传失败: ' + error.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleDelete(id: string, url: string, type: 'photos' | 'videos') {
    if (!confirm('确定要删除这项内容吗？')) return;

    try {
      // 1. 删除数据库记录
      const tableName = type === 'photos' ? 'images' : 'hero_videos';
      const { error: dbError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. 尝试从存储桶删除文件 (通过解析文件名)
      try {
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/');
        const fileName = pathSegments[pathSegments.length - 1];

        await supabase.storage
          .from(type)
          .remove([fileName]);
      } catch (storageError) {
        console.warn('Could not delete corresponding file from storage', storageError);
      }

      await fetchData();
    } catch (error: any) {
      alert('删除失败: ' + error.message);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <form onSubmit={handleLogin} className="flex flex-col gap-6 rounded-2xl bg-white p-10 shadow-xl dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 w-full max-w-md m-4">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Qing 控制台
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              请输入密码以进入后台管理系统
            </p>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="管理员密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3.5 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-white transition-all"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 active:scale-[0.98] transition-all"
            >
              登录系统
            </button>
            {errorMsg && (
              <p className="text-center text-sm font-medium text-red-500 mt-2 animate-bounce">
                {errorMsg}
              </p>
            )}
          </div>
          <div className="text-center pt-2">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              &larr; 返回主页
            </Link>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row">
      {/* 侧边栏 (移动端横向导航 / 桌面端侧边栏) */}
      <aside className="w-full md:w-64 bg-white dark:bg-zinc-900 border-b md:border-b-0 md:border-r border-gray-200 dark:border-zinc-800 p-4 md:p-6 flex flex-col md:min-h-screen md:sticky md:top-0 z-10">
        <div className="flex justify-between items-center mb-4 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Qing 控制台</h1>
          <button
            onClick={handleLogout}
            className="md:hidden text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg"
            aria-label="退出登录"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide snap-x">
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-lg transition-colors font-medium text-sm md:text-base snap-start ${activeTab === 'photos' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-gray-100/50 hover:bg-gray-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800'}`}
          >
            <Camera className="w-4 h-4 md:w-5 md:h-5" />
            照片列表
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-4 py-2.5 md:py-3 rounded-lg transition-colors font-medium text-sm md:text-base snap-start ${activeTab === 'videos' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400' : 'bg-gray-100/50 hover:bg-gray-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800'}`}
          >
            <Video className="w-4 h-4 md:w-5 md:h-5" />
            轮播视频管理
          </button>
        </nav>

        <div className="hidden md:block mt-auto pt-6 border-t border-gray-200 dark:border-zinc-800 space-y-3">
          <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors px-4 py-2">
            <Camera className="w-5 h-5" />
            返回主站首页
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center w-full gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 w-full max-w-[100vw] overflow-hidden p-4 sm:p-6 md:p-10 pb-24 md:pb-10">
        <header className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold truncate">
              {activeTab === 'photos' ? '照片列表' : '主页轮播视频'}
            </h2>
            <p className="text-sm mt-1 text-zinc-500 line-clamp-1">管理展示在前端的数据内容</p>
          </div>

          <label className={`flex-shrink-0 cursor-pointer px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 text-white transition-all active:scale-95 shadow-md ${activeTab === 'photos' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'}`}>
            <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-medium text-sm sm:text-base whitespace-nowrap">
              {uploading ? '上传中...' : '上传'}
            </span>
            <input
              type="file"
              accept={activeTab === 'photos' ? 'image/*' : 'video/*'}
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            {activeTab === 'photos' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4 md:p-6">
                {photos.length === 0 && <div className="col-span-full text-center py-10 text-zinc-500">暂无照片数据</div>}
                {photos.map(photo => (
                  <div key={photo.id} className="group relative aspect-[3/4] sm:aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700">
                    <img src={photo.image_url} alt={photo.title || 'Photo'} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleDelete(photo.id, photo.image_url, 'photos')}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg active:scale-90"
                        aria-label="删除图片"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col">
                {videos.length === 0 && <div className="text-center py-16 text-zinc-500">暂无视频数据</div>}
                {videos.map(vid => (
                  <div key={vid.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 border-b border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="w-32 sm:w-48 aspect-video bg-black rounded overflow-hidden flex-shrink-0 relative">
                      <video src={vid.src} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow w-full">
                      <h4 className="font-medium text-base sm:text-lg truncate max-w-[200px] sm:max-w-sm">{vid.title || '未命名视频'}</h4>
                      <p className="text-xs sm:text-sm text-zinc-500 mt-1">{new Date(vid.created_at).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(vid.id, vid.src, 'videos')}
                      className="self-end sm:self-auto text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 sm:p-3 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:inline">删除</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 移动端底部返回主页悬浮按钮 */}
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
          <Link href="/" className="flex items-center justify-center w-full gap-2 text-zinc-600 dark:text-zinc-300 font-medium py-2 bg-gray-100 dark:bg-zinc-800 rounded-lg active:scale-95 transition-transform">
            <Camera className="w-5 h-5" />
            返回主站展示页
          </Link>
        </div>
      </main>
    </div>
  );
}