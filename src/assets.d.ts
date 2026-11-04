declare module '*?url' {
  const url: string;
  export default url;
}

interface ImportMeta { readonly env: Record<string,string>; }
