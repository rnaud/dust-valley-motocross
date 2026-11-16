// Raw dependencies, captured atomically while stopped. Only the first entry
// initializes camera state; later bytes are assertions or external bike/input data.
static int chase_memory_block(FILE*out,DWORD address,DWORD size,int*first){
 BYTE bytes[0x1330];if(!address||size>sizeof bytes||!read_memory(address,bytes,size))return 0;
 fprintf(out,"%s{\"address\":%lu,\"size\":%lu,\"hex\":\"",*first?"":",",address,size);*first=0;
 for(DWORD i=0;i<size;i++)fprintf(out,"%02x",bytes[i]);fprintf(out,"\"}");return 1;
}
static int capture_chase_memory(FILE*out,const char*phase,DWORD frame,DWORD camera,DWORD dt){
 DWORD app,owner,target,terrain,rider,root,renderRider,renderRoot,devices,keyboard,joystick,filter;
 if(!read_memory(0x4e4fb4,&app,4)||!read_memory(camera+0x1c,&owner,4)||!read_memory(camera+0x1ec,&target,4)||!read_memory(camera+0x1f0,&terrain,4)||
 !read_memory(target+0x874,&rider,4)||!read_memory(target+0x434,&root,4)||!read_memory(target+0xc8c,&renderRider,4)||!read_memory(renderRider+0x434,&renderRoot,4)||
 !read_memory(app+0x10,&devices,4)||!read_memory(devices+0x24,&keyboard,4)||!read_memory(devices+0xc,&joystick,4))return 0;
 fprintf(out,"{\"phase\":\"%s\",\"frame\":%lu,\"camera\":%lu,\"deltaBits\":%lu,\"blocks\":[",phase,frame,camera,dt);int first=1;
 DWORD pairs[][2]={{0x4e4fb4,4},{0x51edb0,12},{camera,0x254},{app,0x1330},{owner,0x40},{target,0xcc8},{terrain,0xa08},{rider,0x3ac},{root,0x260},{renderRider+0x434,4},{renderRoot,0x260},{devices,0x28},{keyboard,0x1100}};
 for(unsigned i=0;i<sizeof pairs/sizeof pairs[0];i++)if(!chase_memory_block(out,pairs[i][0],pairs[i][1],&first))return 0;
 if(joystick&&!chase_memory_block(out,joystick,0x600,&first))return 0;
 for(unsigned o=0x210;o<=0x228;o+=4)if(!read_memory(camera+o,&filter,4)||!filter||!chase_memory_block(out,filter,16,&first))return 0;
 fprintf(out,"]}\n");return !ferror(out);
}
