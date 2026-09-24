import {expect,Page} from "@playwright/test";

export const DB_G10_A11Y_SCANNER_VERSION="db-g10-a11y-v1";

export async function scanAccessibility(page:Page){
  const result=await page.evaluate(()=>{
    const violations:{rule:string;detail:string}[]=[];
    const add=(rule:string,detail:string)=>violations.push({rule,detail});
    const visible=(el:Element)=>{
      const style=getComputedStyle(el as HTMLElement);
      const rect=(el as HTMLElement).getBoundingClientRect();
      return style.display!=="none"&&style.visibility!=="hidden"&&rect.width>0&&rect.height>0;
    };
    if(document.documentElement.lang.toLowerCase()!=="en")add("html-lang","Document language must be English.");
    const mains=[...document.querySelectorAll("main")].filter(visible);
    if(mains.length!==1)add("main-landmark","Expected one visible main landmark, found "+mains.length+".");
    const h1=[...document.querySelectorAll("h1")].filter(visible);
    if(h1.length!==1)add("single-h1","Expected one visible h1, found "+h1.length+".");
    const ids=[...document.querySelectorAll("[id]")].map(el=>el.id).filter(Boolean);
    const duplicateIds=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
    if(duplicateIds.length)add("duplicate-id",duplicateIds.join(", "));
    for(const image of [...document.querySelectorAll("img")])if(!image.hasAttribute("alt"))add("image-alt","Visible image lacks alt attribute.");
    for(const el of [...document.querySelectorAll("button,a[href],input:not([type=hidden]),select,textarea")].filter(visible)){
      const node=el as HTMLElement;
      const text=(node.innerText||"").trim();
      const aria=(node.getAttribute("aria-label")||"").trim();
      const labelledBy=(node.getAttribute("aria-labelledby")||"").trim();
      let nativeLabel=false;
      if(node instanceof HTMLInputElement||node instanceof HTMLSelectElement||node instanceof HTMLTextAreaElement){
        nativeLabel=Boolean(node.labels?.length);
      }
      if(!text&&!aria&&!labelledBy&&!nativeLabel)add("accessible-name",node.tagName.toLowerCase()+" lacks an accessible name.");
      const tabindex=node.getAttribute("tabindex");
      if(tabindex!==null&&Number(tabindex)>0)add("positive-tabindex",node.tagName.toLowerCase()+" uses tabindex="+tabindex+".");
    }
    for(const table of [...document.querySelectorAll("table")].filter(visible))if(!table.querySelector("th"))add("table-headers","Visible table has no header cells.");
    const headings=[...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).map(h=>Number(h.tagName.slice(1)));
    for(let i=1;i<headings.length;i++)if(headings[i]>headings[i-1]+1)add("heading-order","Heading level jumps from h"+headings[i-1]+" to h"+headings[i]+".");
    if(document.documentElement.scrollWidth>window.innerWidth+2)add("horizontal-overflow","Document width "+document.documentElement.scrollWidth+"px exceeds viewport "+window.innerWidth+"px.");
    return violations;
  });
  expect(result,DB_G10_A11Y_SCANNER_VERSION+" violations").toEqual([]);
}

export async function expectVisibleKeyboardFocus(page:Page){
  await page.keyboard.press("Tab");
  const focused=await page.evaluate(()=>{
    const el=document.activeElement as HTMLElement|null;
    if(!el)return null;
    const style=getComputedStyle(el);
    return {tag:el.tagName,outlineStyle:style.outlineStyle,outlineWidth:style.outlineWidth};
  });
  expect(focused).not.toBeNull();
  expect(focused?.tag).not.toBe("BODY");
  expect(focused?.outlineStyle).not.toBe("none");
  expect(focused?.outlineWidth).not.toBe("0px");
}
