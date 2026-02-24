/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { FolderOpen, Download, FileText, TreePine, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileInfo {
  path: string;
  content: string;
  name: string;
}

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [treeString, setTreeString] = useState<string>('');
  const [combinedContent, setCombinedContent] = useState<string>('');
  const [fileCount, setFileCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setTreeString('');
    setCombinedContent('');

    try {
      const fileList = Array.from(files) as File[];
      
      // 1. Generate Tree
      const tree = generateTree(fileList);
      setTreeString(tree);

      // 2. Extract Content
      const allowedExtensions = ['.css', '.php', '.js', '.htaccess', '.html', '.ts', '.tsx', '.json'];
      const extractedFiles: FileInfo[] = [];

      for (const file of fileList) {
        const fileName = file.name;
        const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext)) || fileName === '.htaccess';
        
        if (isAllowed) {
          const content = await readFileContent(file);
          // webkitRelativePath gives the path within the selected folder
          extractedFiles.push({
            path: (file as any).webkitRelativePath || file.name,
            content,
            name: fileName
          });
        }
      }

      // 3. Combine Content
      let finalDoc = `DIRECTORY TREE:\n${tree}\n\n${'='.repeat(50)}\n\n`;
      
      extractedFiles.forEach((file, index) => {
        finalDoc += `FILE PATH: ${file.path}\n`;
        finalDoc += `${'-'.repeat(file.path.length + 11)}\n`;
        finalDoc += file.content;
        
        if (index < extractedFiles.length - 1) {
          finalDoc += '\n'.repeat(11); // 10 empty lines + 1 for the next line
        }
      });

      setCombinedContent(finalDoc);
      setFileCount(extractedFiles.length);
    } catch (error) {
      console.error('Error processing files:', error);
      alert('Er is een fout opgetreden bij het verwerken van de bestanden.');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTree = (files: File[]): string => {
    const root: any = {};
    
    files.forEach(file => {
      const path = (file as any).webkitRelativePath || file.name;
      const parts = path.split('/');
      let current = root;
      parts.forEach((part: string, index: number) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? null : {};
        }
        current = current[part];
      });
    });

    const buildTreeString = (obj: any, prefix = ''): string => {
      let result = '';
      const keys = Object.keys(obj).sort();
      
      keys.forEach((key, index) => {
        const isLast = index === keys.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        result += `${prefix}${connector}${key}\n`;
        
        if (obj[key] !== null) {
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          result += buildTreeString(obj[key], newPrefix);
        }
      });
      
      return result;
    };

    // The first key is usually the folder name itself
    const rootKey = Object.keys(root)[0];
    if (!rootKey) return '';
    
    return `${rootKey}\n${buildTreeString(root[rootKey])}`;
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const downloadFile = () => {
    if (!combinedContent) return;
    
    const blob = new Blob([combinedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project_export.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-serif italic mb-4"
          >
            Code Tree & Extractor
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg opacity-60 max-w-2xl"
          >
            Selecteer een map om een visuele directory tree te genereren en alle broncode te extraheren naar één overzichtelijk document.
          </motion.p>
        </header>

        <main className="space-y-8">
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-black/5">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-black/10 rounded-2xl p-12 transition-colors hover:border-black/20">
              <FolderOpen className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-center mb-6 opacity-60">
                Klik op de knop hieronder om een map te kiezen.<br/>
                Alle submappen en bestanden worden automatisch verwerkt.
              </p>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFolderSelect}
                className="hidden"
                // @ts-ignore - webkitdirectory is a non-standard attribute but widely supported
                webkitdirectory=""
                directory=""
                multiple
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="bg-[#141414] text-white px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verwerken...
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-5 h-5" />
                    Kies Map
                  </>
                )}
              </button>
            </div>
          </section>

          <AnimatePresence>
            {treeString && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 opacity-40 uppercase text-xs font-bold tracking-widest">
                    <TreePine className="w-4 h-4" />
                    Directory Tree
                  </div>
                  <pre className="bg-[#F9F9F7] p-4 rounded-xl font-mono text-xs overflow-auto max-h-[400px] flex-grow whitespace-pre">
                    {treeString}
                  </pre>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-sm border border-black/5 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 opacity-40 uppercase text-xs font-bold tracking-widest">
                    <FileText className="w-4 h-4" />
                    Extractie Status
                  </div>
                  <div className="flex-grow flex flex-col justify-center items-center text-center p-6">
                    <div className="bg-emerald-50 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-medium mb-2">{fileCount} Bestanden</h3>
                    <p className="opacity-60 mb-8">
                      Alle .css, .php, .js en .htaccess bestanden zijn succesvol geëxtraheerd en samengevoegd.
                    </p>
                    <button
                      onClick={downloadFile}
                      className="w-full border border-black/10 px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-all active:scale-95"
                    >
                      <Download className="w-5 h-5" />
                      Download Document
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-24 pt-8 border-t border-black/5 text-center opacity-30 text-sm">
          <p>&copy; {new Date().getFullYear()} Code Tree & Extractor Tool</p>
        </footer>
      </div>
    </div>
  );
}
