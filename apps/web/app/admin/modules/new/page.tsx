import { ModuleCreateClient } from "@/components/module-create-client";
import { PageIntro } from "@/components/page-state";
import { serverApi } from "@/lib/api";
type Category={id:string;name:string};
export const metadata={title:"Criar módulo"};
export default async function NewModulePage(){const categories=await serverApi<Array<Category&Record<string,unknown>>>("/api/v1/admin/categories");return <><PageIntro title="Criar módulo" description="Crie um esqueleto vazio agora ou carregue a implementação depois pela página do módulo."/><ModuleCreateClient categories={categories.map(({id,name})=>({id,name}))}/></>}
