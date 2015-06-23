
Ext.ns('app.medialib');Ext.define('app.medialib.CategoryTree',{extend:'Ext.tree.Panel',controllerUrl:'',canEdit:false,canDelete:false,constructor:function(config){config=Ext.apply({rootVisible:true,useArrows:false},config||{});this.callParent(arguments);},initComponent:function(){var tbar=[];if(this.canEdit){this.viewConfig={plugins:{ptype:'treeviewdragdrop',ddGroup:'medialibraryItem',displayField:'title'},listeners:{drop:{fn:this.sortChanged,scope:this}}}
tbar.push({iconCls:'plusIcon',text:appLang.ADD_ITEM,handler:function(){var sm=this.getSelectionModel();if(sm.hasSelection()){this.showCategoryEditor(0,sm.getSelection()[0].get('id'));}else{this.showCategoryEditor(0);}},scope:this});}
if(this.canDelete){tbar.push('->');tbar.push({iconCls:'deleteIcon',text:appLang.DELETE_ITEM,handler:function(){var sm=this.getSelectionModel();if(!sm.hasSelection()){return;}
this.deleteRecord(sm.getSelection()[0]);},scope:this});}
if(tbar.length){this.tbar=tbar;}
this.store=Ext.create('Ext.data.TreeStore',{proxy:{type:'ajax',url:this.controllerUrl+'treelist',reader:{type:'json',idProperty:'id'}},root:{text:'/',expanded:true,dragable:false,id:0},listeners:{load:{fn:function(){this.getSelectionModel().select(0);},scope:this}}});this.callParent(arguments);this.on('itemdblclick',function(view,record,element,index,e,eOpts){if(record.get('id')!==0){this.showCategoryEditor(record.get('id'));}},this);this.getSelectionModel().on('selectionchange',function(sm,selected,options){if(!sm.hasSelection()){this.fireEvent('itemSelected',0);return;}
var rec=selected[0];this.fireEvent('itemSelected',rec.get('id'));},this);if(this.canEdit){var view=this.getView();view.on('beforedrop',function(node,data,overModel,dropPosition,dropHandlers){if(data.records[0].get('path')){dropHandlers.cancelDrop();var parentNode=null;if(dropPosition=='append'){parentNode=overModel;}else{parentNode=overModel.parentNode;}
this.addMediaItems(data.records,parentNode.get('id'));}},this);}},sortChanged:function(node,data,overModel,dropPosition,options){if(!this.canEdit){return;}
var parentNode=null;if(dropPosition=='append'){parentNode=overModel;}else{parentNode=overModel.parentNode;}
var view=this.getView();var childsOrder=[];parentNode.eachChild(function(node){childsOrder.push(node.getId());},this);Ext.Ajax.request({url:this.controllerUrl+'sortcatalog',method:'post',params:{'id':data.records[0].get('id'),'newparent':parentNode.get('id'),'order[]':childsOrder},success:function(response,request){response=Ext.JSON.decode(response.responseText);if(response.success){return;}else{Ext.Msg.alert(appLang.MESSAGE,response.msg);}},failure:app.formFailure});},showCategoryEditor:function(id,parent_id)
{if(parent_id==undefined){parent_id=0;}
var win=Ext.create('app.editWindow',{title:appLang.EDIT,controllerUrl:this.controllerUrl,canEdit:this.canEdit,canDelete:false,useTabs:false,showToolbar:false,hideEastPanel:true,objectName:'mediacategory',dataItemId:id,width:300,height:150,items:[{xtype:'textfield',fieldLabel:appLang.TITLE,name:'title',labelWidth:70},{xtype:'hidden',name:'parent_id',value:parent_id}]});win.on('dataSaved',function(){var itemId=win.dataItemId;var itemText=win.getForm().getForm().findField('title').getValue();var rootNode=this.getRootNode();var node;if(!id)
{if(!parent_id)
{node=rootNode.appendChild({id:itemId,text:itemText,leaf:false,dragable:true,children:[]});}else{node=rootNode.findChild("id",parent_id,true).appendChild({id:itemId,text:itemText,leaf:false,dragable:true,children:[]});}}else{node=rootNode.findChild("id",id,true)}
node.set('text',itemText);node.commit();win.close();},this);win.show();},reloadData:function(){this.store.getRootNode().removeAll();this.store.load();},deleteRecord:function(record){var me=this;Ext.Msg.confirm(appLang.CONFIRM,appLang.MSG_CONFIRM_DELETE+' "'+record.get('text')+'"',function(btn){if(btn!='yes'){return false;}
Ext.Ajax.request({url:me.controllerUrl+'delete',method:'post',params:{'id':record.get('id')},success:function(response,request){response=Ext.JSON.decode(response.responseText);if(response.success){record.remove();me.doLayout();}else{Ext.Msg.alert(appLang.MESSAGE,response.msg);}},failure:function(){Ext.Msg.alert(appLang.MESSAGE,appLang.MSG_LOST_CONNECTION);blockMap.unmask();}});});},addMediaItems:function(items,catalogId){var mediaItems=[];var me=this;Ext.each(items,function(item){mediaItems.push(item.get('id'));});Ext.Ajax.request({url:me.controllerUrl+'placeitems',method:'post',params:{'items':Ext.JSON.encode(mediaItems),'catalog':catalogId},success:function(response,request){response=Ext.JSON.decode(response.responseText);if(response.success){me.fireEvent('itemsPlaced');}else{Ext.Msg.alert(appLang.MESSAGE,response.msg);}},failure:function(){Ext.Msg.alert(appLang.MESSAGE,appLang.MSG_LOST_CONNECTION);blockMap.unmask();}});}});Ext.ns('app.medialib');app.medialib.typesStore=Ext.create('Ext.data.Store',{model:'app.comboStringModel',data:[{id:"",title:appLang.ALL},{id:"file",title:appLang.FILE},{id:"image",title:appLang.IMAGE},{id:"audio",title:appLang.AUDIO},{id:"video",title:appLang.VIDEO}]});Ext.define('app.medialibPanel',{extend:'Ext.Panel',dataGrid:null,dataStore:null,dataPropertiesForm:null,dataProperties:null,dataCatalog:null,dataTabs:null,dataTree:null,searchField:null,srcTypeFilter:null,selectedCategory:0,checkRights:false,canEdit:false,canDelete:false,canView:true,addFilesBtn:null,constructor:function(config){config=Ext.apply({layout:'border',tbar:new Ext.Panel({border:false,bodyBorder:false,items:[]})},config||{});this.callParent(arguments);},getRights:function(){var me=this;Ext.Ajax.request({url:app.admin+app.delimiter+'medialib'+app.delimiter+'rights',method:'post',timeout:240000,success:function(response,request){response=Ext.JSON.decode(response.responseText);if(response.success){me.canEdit=response.data.canEdit;me.canDelete=response.data.canDelete;}else{me.canView=false;}
me.onRightsChecked();},failure:function(){me.canView=false;me.onRightsChecked();Ext.Msg.alert(appLang.MESSAGE,appLang.CANT_EXEC);}});},initComponent:function(){this.callParent();if(this.checkRights){this.getRights();}else{this.onRightsChecked();}},onRightsChecked:function(){this.createPanels();this.fireEvent('rightsChecked');},initMainStore:function()
{this.dataStore=Ext.create('Ext.data.Store',{model:'app.medialibModel',proxy:{type:'ajax',url:app.admin+app.delimiter+'medialib'+app.delimiter+'list',reader:{type:'json',rootProperty:'data',totalProperty:'count',idProperty:'id'},startParam:'pager[start]',limitParam:'pager[limit]',sortParam:'pager[sort]',directionParam:'pager[dir]',simpleSortMode:true},pageSize:30,remoteSort:true,autoLoad:false,sorters:[{property:'date',direction:'DESC'}]});},createPanels:function()
{this.initMainStore();this.srcTypeFilter=Ext.create('Ext.form.ComboBox',{displayField:"title",queryMode:"local",forceSelection:true,store:app.medialib.typesStore,triggerAction:"all",valueField:"id",allowBlank:false,value:"",width:150});var handle=this;var columnConfig=[];if(this.canEdit){columnConfig.push({xtype:'actioncolumn',align:'center',width:30,items:[{tooltip:appLang.EDIT_RECORD,iconCls:'editIcon',width:30,handler:function(grid,rowIndex,colIndex){handle.showEdit(grid.getStore().getAt(rowIndex));}}]});}
columnConfig.push({text:appLang.ICON,dataIndex:'id',width:80,align:'center',sortable:false,xtype:'templatecolumn',tpl:new Ext.XTemplate('<div style="white-space:normal;" >','<img src="{icon}?{modified}" alt="[icon]"  style="border:1px solid #000000;"/>','<div>')});columnConfig.push({text:appLang.TITLE,dataIndex:'title',sortable:true,xtype:'templatecolumn',flex:1,tpl:new Ext.XTemplate('<div style="white-space:normal;" >','<b>'+appLang.TITLE+':</b> {title}<br>','<b>'+appLang.TYPE+':</b> {type}<br>','<b>'+appLang.SIZE+':</b> {size} mb<br>','<b>'+appLang.UPLOADED_BY+':</b> {user_name} <br>','<b>'+appLang.CAPTION+':</b> {caption} <br>','<div>')});columnConfig.push({text:appLang.UPLOAD_DATE,width:110,dataIndex:'date',xtype:'datecolumn',sortable:true,format:'M d, Y H:i'});if(this.canDelete){columnConfig.push({xtype:'actioncolumn',width:20,align:'center',items:[{iconCls:'deleteIcon',tooltip:appLang.DELETE,scope:this,handler:function(grid,rowIndex,colIndex){var record=grid.getStore().getAt(rowIndex);Ext.Msg.confirm(appLang.CONFIRM,appLang.REMOVE_IMAGE+' '+record.get('title')+'?',function(btn){if(btn!='yes'){return false;}
this.deleteItem(grid.getStore().getAt(rowIndex));},this);}}]});}
this.searchField=new SearchPanel({store:this.dataStore,local:false});this.addFilesBtn=Ext.create('Ext.Button',{text:appLang.ADD_FILES,hidden:!this.canEdit,listeners:{click:{fn:function(){var win=Ext.create('app.fileUploadWindow',{uploadUrl:app.createUrl([app.admin,'medialib','upload',this.selectedCategory])});win.on('filesuploaded',function(){this.dataStore.load();},this);win.show();},scope:this}}});this.dataGrid=Ext.create('Ext.grid.Panel',{store:this.dataStore,region:'center',selModel:{mode:'MULTI'},viewConfig:{stripeRows:true,plugins:{ptype:'gridviewdragdrop',dragGroup:'medialibraryItem',enableDrag:this.canEdit}},tbar:[this.addFilesBtn,'-',appLang.MEDIA_TYPE_FILTER+':',this.srcTypeFilter,'->',this.searchField],frame:false,loadMask:true,columnLines:false,scrollable:true,columns:columnConfig,bbar:Ext.create('Ext.PagingToolbar',{store:this.dataStore,displayInfo:true,displayMsg:appLang.DISPLAYING_RECORDS+' {0} - {1} '+appLang.OF+' {2}',emptyMsg:appLang.NO_RECORDS_TO_DISPLAY})});this.dataPropertiesForm=Ext.create('Ext.form.Panel',{hidden:true,frame:true,border:false,scrollable:true,fieldDefaults:{labelAlign:'left',labelWidth:120,bodyStyle:'font-size:12px;',labelStyle:'font-weight:bold;',xtype:'displayfield',anchor:"100%"},defaultType:'displayfield',items:[{xtype:'imagefield',fieldLabel:appLang.THUMBNAIL,name:'thumbnail'},{allowBlank:false,fieldLabel:appLang.TYPE,name:"type"},{allowBlank:false,fieldLabel:appLang.TITLE,name:"title"},{allowBlank:false,fieldLabel:appLang.SIZE_MB,name:"size"},{allowBlank:false,fieldLabel:appLang.UPLOADED_BY,name:"user_name"},{fieldLabel:appLang.ALTER_TEXT,name:"alttext"},{fieldLabel:appLang.CAPTION,name:"caption"},{fieldLabel:appLang.DESCRIPTION,name:"description"}]});this.dataProperties=Ext.create('Ext.Panel',{title:appLang.FILE_INFO,layout:'fit',frame:true,border:false,items:[this.dataPropertiesForm]});this.dataTree=Ext.create('app.medialib.CategoryTree',{title:appLang.MEDIA_CATEGORIES,layout:'fit',border:false,canEdit:this.canEdit,canDelete:this.canDelete,controllerUrl:app.createUrl([app.admin,'mediacategory','']),listeners:{'itemSelected':{fn:function(id){this.selectedCategory=id;this.dataStore.proxy.setExtraParam('filter[category]',id);this.dataStore.load();},scope:this},'itemsPlaced':{fn:function(){this.dataStore.load();},scope:this}}});this.dataTabs=Ext.create('Ext.tab.Panel',{region:'east',deferredRender:false,layout:'fit',width:350,minWidth:350,scrollable:false,split:true,frame:true,border:false,items:[this.dataTree,this.dataProperties]});this.srcTypeFilter.on('select',function(field,value,options){this.dataStore.proxy.setExtraParam('filter[type]',field.getValue());this.dataStore.load();},this);this.dataGrid.on('selectionchange',function(sm,selected){if(sm.hasSelection())
{var record=sm.getLastSelected();this.dataPropertiesForm.getForm().reset();this.dataPropertiesForm.getForm().loadRecord(record);this.dataPropertiesForm.getForm().findField('thumbnail').setValue(record.get('thumbnail')+'?'+record.get('modified'));this.dataPropertiesForm.show();}
else
{this.dataPropertiesForm.hide();}},this);if(this.canEdit){this.dataGrid.on('itemdblclick',function(view,record,number,event,options){this.showEdit(record);},this);}
if(this.canView){this.add([this.dataGrid,this.dataTabs]);}else{this.add([{xtype:'panel',layout:'fit',region:'center',html:'<center><h2>'+appLang.CANT_VIEW+'</h2></center>'}]);}
this.fireEvent('createPanels');},showEdit:function(record){var win=Ext.create('app.medialib.EditWindow',{mainGridId:this.dataGrid.getId(),viewFormId:this.dataPropertiesForm.getId(),recordId:record.get('id'),dataRec:record});win.on('dataSaved',function(){this.dataGrid.getSelectionModel().clearSelections();this.dataStore.load();win.close();},this);win.show();},deleteItem:function(record){var handler=this;Ext.Ajax.request({url:app.admin+app.delimiter+'medialib'+app.delimiter+'remove',method:'post',timeout:240000,params:{'id':record.get('id')},success:function(response,request){response=Ext.JSON.decode(response.responseText);if(response.success){handler.dataStore.remove(record);}else{Ext.Msg.alert(appLang.MESSAGE,response.msg);}},failure:function(){Ext.Msg.alert(appLang.MESSAGE,appLang.CANT_EXEC);}});}});Ext.define('app.medialibFilesModel',{extend:'Ext.data.Model',fields:[{name:'id',type:'integer'},{name:'type',type:'string'},{name:'url',type:'string'},{name:'thumb',type:'string'},{name:'thumbnail',type:'string'},{name:'title'},{name:'size'},{name:'srcpath',type:'string'},{name:'ext',type:'string'},{name:'path',type:'string'},{name:'icon',type:'string'}]});Ext.define('app.medialibModel',{extend:'Ext.data.Model',fields:[{name:'id',type:'integer'},{name:'thumb',type:'string'},{name:'date',type:"date",dateFormat:"Y-m-d H:i:s"},{name:'modified',type:'string'},{name:'title',type:'string'},{name:'alttext',type:'string'},{name:'text',type:'string'},{name:'caption',type:'string'},{name:'description',type:'string'},{name:'size',type:'float'},{name:'user_id',type:'integer'},{name:'path',type:'string'},{name:'type',type:'string'},{name:'user_name',type:'string'},{name:'ext',type:'string'},{name:'srcpath',type:'string'},{name:'thumbnail',type:'string'},{name:'icon',type:'string'}]});Ext.ns('app.medialib');Ext.define('app.fileUploadWindow',{extend:'Ext.Window',contentPanel:null,uploadUrl:null,selectedCategory:0,constructor:function(config){config=Ext.apply({cls:'upload_window',modal:true,layout:'fit',title:appLang.MODULE_MEDIALIB+' :: '+appLang.FILE_UPLOAD,width:420,height:500,closeAction:'destroy',resizable:false,items:[]},config||{});this.callParent(arguments);},initComponent:function(){var me=this;var accExtString='<div><b>'+appLang.MAX_UPLOAD_FILE_SIZE+'</b><br> '+app.maxFileSize+'<br>';for(i in app.mediaConfig){if(Ext.isEmpty(i.title)){accExtString+='<b>'+app.mediaConfig[i].title+'</b><br> ';var cnt=0;var len=app.mediaConfig[i].extensions.length;Ext.each(app.mediaConfig[i].extensions,function(extName){if(cnt<(len-1)){accExtString+=extName+', ';}else{accExtString+=extName;}
cnt++;});accExtString+='<br>';}}
accExtString+='</div>';this.simpleUpload=Ext.create('Ext.form.Panel',{region:'north',fileUpload:true,padding:5,height:80,frame:true,border:false,layout:'hbox',fieldDefaults:{anchor:"100%",hideLabel:true},items:[{xtype:'filefield',emptyText:appLang.SELECT_FILE,flex:1,buttonText:'',buttonConfig:{iconCls:'upload-icon'},name:'file'},{xtype:'label',text:appLang.ACCEPTED_FORMATS,style:{textDecoration:'underline',padding:'5px',fontSize:'10px',color:'#3F1BF6',cursor:'pointer'},listeners:{afterrender:{fn:function(cmp){cmp.getEl().on('click',function(){Ext.Msg.alert(appLang.ACCEPTED_FORMATS,accExtString);});},scope:this}}}],buttons:[{text:appLang.UPLOAD,listeners:{'click':{fn:function(){this.simpleUploadStart();},scope:this}}}]});this.simpleUploadedGrid=Ext.create('Ext.grid.Panel',{region:'center',store:Ext.create('Ext.data.Store',{autoLoad:false,idProperty:'url',model:'app.medialibFilesModel'}),viewConfig:{stripeRows:true},frame:false,loadMask:true,columnLines:false,scrollable:true,columns:[{text:appLang.ICON,dataIndex:'thumb',align:'center',xtype:'templatecolumn',tpl:new Ext.XTemplate('<div style="white-space:normal;">','<img src="{icon}" alt="[icon]" style="border:1px solid #000000;" height="32"/>','</div>'),width:80},{text:appLang.INFO,dataIndex:'id',flex:1,xtype:'templatecolumn',tpl:function(){return new Ext.XTemplate('<div style="white-space:normal;">',' '+appLang.TYPE+': {type}<br>',' '+appLang.TITLE+': {title}<br>',' '+appLang.SIZE+': {size}<br>','</div>');}()},{xtype:'actioncolumn',width:40,items:[{iconCls:'editIcon',tooltip:appLang.EDIT_RESOURCE,scope:this,handler:function(grid,rowIndex,colIndex){var record=grid.getStore().getAt(rowIndex);var win=Ext.create('app.medialib.EditWindow',{'recordId':record.get('id'),'dataRec':record});win.on('dataSaved',function(){grid.getStore().removeAt(rowIndex);this.fireEvent('filesuploaded');win.close();},this);win.show();}}]}]});this.multipleUploadedGrid=Ext.create('Ext.grid.Panel',{region:'center',store:Ext.create('Ext.data.Store',{autoLoad:false,idProperty:'id',fields:[{name:'id',type:'integer'},{name:'icon',type:'string'},{name:'progress',type:'float'},{name:'name',type:'string'},{name:'uploaded',type:'boolean'},{name:'uploadError',type:'string'}]}),viewConfig:{stripeRows:true},frame:false,loadMask:true,columnLines:false,scrollable:true,columns:[{text:appLang.ICON,dataIndex:'icon',align:'center',xtype:'templatecolumn',tpl:new Ext.XTemplate('<div style="white-space:normal;">','<img src="{icon}" alt="[icon]" style="border:1px solid #000000;" height="32"/>','</div>'),width:80},{text:appLang.NAME,dataIndex:'name',flex:1,renderer:function(v,m,r){if(r.get('uploadError').length){v+='<br><span style="color:red;">'+r.get('uploadError')+'</span>';}
return v;}},{text:appLang.PROGRESS,dataIndex:'progress',width:100,renderer:app.progressRenderer},{width:40,dataIndex:'id',renderer:function(v,m,r){if(r.get('uploaded')){return'<img src="'+app.wwwRoot+'i/system/edit.png" title="'+appLang.EDIT_RESOURCE+'">';}else{return'';}}}]});this.multipleUploadedGrid.on('itemclick',function(grid,record,item,index,e,eOpts){if(record.get('uploaded')){var file=this.ajaxUploadField.getFile(record.get('id'));if(!file||!file.uploadResult){return;}
var item=file.uploadResult.data[0];var win=Ext.create('app.medialib.EditWindow',{'recordId':item.id,'dataRec':new app.medialibFilesModel(item)});win.on('dataSaved',function(){this.fireEvent('filesuploaded');win.close();},this);win.show();}},this);this.ajaxUploadField=Ext.create('Ext.ux.form.AjaxFileUploadField',{emptyText:appLang.SELECT_FILE,buttonText:appLang.MULTIPLE_FILE_UPLOAD,buttonOnly:true,defaultIcon:app.wwwRoot+'i/unknown.png',url:this.uploadUrl,buttonConfig:{iconCls:'upload-icon'},listeners:{'filesSelected':{fn:me.onMFilesSelected,scope:this},'fileUploaded':{fn:me.onMFileUploaded,scope:this},'fileUploadProgress':{fn:me.onMFilesUploadProgress,scope:this},'fileUploadError':{fn:me.onMFilesUploadError,scope:this},'fileImageLoaded':{fn:me.onMFilesImageLoaded,scope:this},'filesUploaded':{fn:me.onMFilesUploaded,scope:this}}});var linkLabel=Ext.create('Ext.form.Label',{text:appLang.ACCEPTED_FORMATS,style:{textDecoration:'underline',padding:'5px',fontSize:'10px',color:'#3F1BF6',cursor:'pointer'},listeners:{afterrender:{fn:function(cmp){cmp.getEl().on('click',function(){Ext.Msg.alert(appLang.ACCEPTED_FORMATS,accExtString);},me);},scope:this}}});this.mClearButton=Ext.create('Ext.Button',{text:appLang.CLEAR,disabled:true,listeners:{'click':{fn:function(){this.ajaxUploadField.reset();this.multipleUploadedGrid.getStore().removeAll();},scope:this}}});this.mUploadButton=Ext.create('Ext.Button',{text:appLang.UPLOAD,disabled:true,listeners:{'click':{fn:function(){this.ajaxUploadField.upload();},scope:this}}});this.multipleUpload=Ext.create('Ext.Panel',{region:'north',fileUpload:true,padding:5,height:80,frame:true,border:false,fieldDefaults:{anchor:"100%",hideLabel:true},layout:'hbox',items:[this.ajaxUploadField,{xtype:'label',flex:1},linkLabel],buttons:[this.mClearButton,this.mUploadButton]});this.simplePanel=Ext.create('Ext.Panel',{title:appLang.SIMPLE_UPLOAD,layout:'border',items:[this.simpleUpload,this.simpleUploadedGrid]});this.multiplePanel=Ext.create('Ext.Panel',{title:appLang.MULTIPLE_FILE_UPLOAD,layout:'border',items:[this.multipleUpload,this.multipleUploadedGrid]});this.contentPanel=Ext.create('Ext.tab.Panel',{activeTab:1,frame:true,scrollable:true,items:[this.simplePanel,this.multiplePanel]});this.items=[this.contentPanel];this.callParent();},onMFilesImageLoaded:function(index,icon){var store=this.multipleUploadedGrid.getStore();var rIndex=store.findExact('id',index);if(index!=-1)
{var rec=store.getAt(rIndex);rec.set('icon',icon);rec.commit();}},onMFilesSelected:function(files){var me=this;var data=[];if(this.ajaxUploadField.filesCount()){Ext.each(this.ajaxUploadField.getFiles(),function(file,index){var progress;file.uploaded?progress=100:progress=0;data.push({id:index,name:file.name,icon:file.icon,progress:progress,uploaded:file.uploaded,uploadError:file.uploadError});},me);}
this.multipleUploadedGrid.getStore().loadData(data);if(!Ext.isEmpty(data)){this.mClearButton.enable();this.mUploadButton.enable();}else{this.mClearButton.disable();this.mUploadButton.disable();}},onMFileUploaded:function(index,result){var store=this.multipleUploadedGrid.getStore();var rIndex=store.findExact('id',index);if(index!=-1){var rec=store.getAt(rIndex);rec.set('uploaded',1);rec.commit();}},onMFilesUploadProgress:function(index,uploaded,total){var store=this.multipleUploadedGrid.getStore();var rIndex=store.findExact('id',index);if(index!=-1){var rec=store.getAt(rIndex);rec.set('progress',(uploaded*100)/total);rec.commit();}},onMFilesUploadError:function(index,result){var file=this.ajaxUploadField.getFile(index);if(!file){return;}
var store=this.multipleUploadedGrid.getStore();var rIndex=store.findExact('id',index);if(index!=-1){var rec=store.getAt(rIndex);rec.set('uploadError',file.uploadError);rec.set('progress',99);rec.commit();}},onMFilesUploaded:function(){this.fireEvent('filesuploaded');},simpleUploadStart:function(){var handle=this;this.simpleUpload.getForm().submit({clientValidation:true,url:this.uploadUrl,waitMsg:appLang.UPLOADING,success:function(form,responce)
{var dat=responce.result.data;Ext.each(dat,function(item){var rec=new app.medialibFilesModel({'id':item.id,'type':item.type,'url':item.url,'thumb':item.thumb,'thumbnail':item.thumbnail,'name':false,'title':item.title,'size':item.size,'srcpath':item.srcpath,'icon':item.icon,'ext':item.ext,'path':item.path});handle.simpleUploadedGrid.getStore().insert(0,rec);});handle.simpleUpload.getForm().reset();handle.fireEvent('filesuploaded');},failure:app.formFailure});}});Ext.ns('app.medialib');Ext.define('app.imageSizeWindow',{extend:'Ext.Window',constructor:function(config){config=Ext.apply({modal:true,layout:'fit',title:appLang.MODULE_MEDIALIB+' :: '+appLang.SELECT_IMAGE_SIZE,width:300,height:198,scrollable:true,closeAction:'destroy',resizable:true,bodyPadding:3},config||{});this.callParent(arguments);},initComponent:function()
{var original={name:'size',boxLabel:appLang.ORIGINAL,value:'',inputValue:'',checked:true};var groupItems=[original];for(index in app.imageSize)
{if(typeof app.imageSize[index]=='function'||app.imageSize[index]==undefined){continue;}
groupItems.push({name:'size',boxLabel:index+' ('+app.imageSize[index][0]+'x'+app.imageSize[index][1]+')',inputValue:'-'+index});}
this.height=groupItems.length*30+40;this.groupFld=Ext.create('Ext.form.RadioGroup',{xtype:'radiogroup',columns:1,width:250,vertical:true,items:groupItems});this.items=[this.groupFld];this.buttons=[{text:appLang.SELECT,listeners:{click:{fn:function(){var value=this.groupFld.getValue().size;this.fireEvent('sizeSelected',value);this.close();},scope:this}}},{text:appLang.CLOSE,listeners:{click:{fn:function(){this.fireEvent('selectCanceled');this.close();},scope:this}}}];this.callParent();}});Ext.define('app.selectMediaItemWindow',{extend:'Ext.Window',medialibPanel:null,actionType:'selectId',resourceType:'all',constructor:function(config){config=Ext.apply({modal:true,layout:'fit',title:appLang.MODULE_MEDIALIB+' :: '+appLang.EDIT_ITEM,width:750,height:app.checkHeight(600),closeAction:'destroy',resizable:true,items:[],maximizable:true},config||{});this.callParent(arguments);},selectItem:function()
{switch(this.actionType){case'selectId':var sm=this.medialibPanel.dataGrid.getSelectionModel();if(!sm.hasSelection()){Ext.MessageBox.alert(appLang.MESSAGE,appLang.MSG_SELECT_RESOURCE);return;}
var records=sm.getSelection();var goodType=true;Ext.each(records,function(rec){if(this.resourceType!='all'&&this.resourceType!=rec.get('type')){goodType=false;}},this);if(!goodType){Ext.MessageBox.alert(appLang.MESSAGE,appLang.SELECT_PLEASE+' '+this.resourceType+' '+appLang.RESOURCE);return;}
this.fireEvent('itemSelected',records);break;}},initComponent:function(){this.medialibPanel=Ext.create('app.medialibPanel',{actionType:this.actionType,border:false,checkRights:true});this.items=[this.medialibPanel];if(this.resourceType!='all'){this.medialibPanel.on('rightsChecked',function(){this.medialibPanel.srcTypeFilter.setValue(this.resourceType);this.medialibPanel.srcTypeFilter.disable();this.medialibPanel.dataStore.proxy.setExtraParam('filter[type]',this.resourceType);this.medialibPanel.dataStore.load();},this);}
var me=this;this.buttons=[{text:appLang.SELECT,scope:me,handler:me.selectItem},{text:appLang.CLOSE,scope:me,handler:me.close}];this.callParent(arguments);}});Ext.define('app.medialib.ItemField',{extend:'Ext.form.field.Display',alias:'widget.medialibitemfield',isFormField:true,submitValue:true,selectButton:null,resetItemBtn:null,resourceType:'all',isEqual:function(value1,value2){return this.isEqualAsString(value1,value2);},fieldSubTpl:['<div id="{id}">','<div id="{id}-icon"></div>','<div id="{id}-description"></div>','<div><div id="{id}-sibtn" style="float:left;"></div><div style="float:left;" id="{id}-ribtn"></div></div>','</div>',{compiled:true,disableFormats:true}],controllerUrl:null,onRender:function(){this.callParent(arguments);this.controllerUrl=app.createUrl([app.admin,app.medialibControllerName,'info']);this.selectButton=Ext.create('Ext.Button',{renderTo:this.getId()+'-inputEl-sibtn',iconCls:'editIcon2',scope:this,text:appLang.SELECT,handler:this.selectItem});this.resetItemBtn=Ext.create('Ext.Button',{renderTo:this.getId()+'-inputEl-ribtn',iconCls:'deleteIcon',scope:this,tooltip:appLang.RESET,handler:this.resetItem});this.imageField=Ext.create('app.ImageField',{renderTo:this.getId()+'-inputEl-icon'});this.descriptionField=Ext.create('Ext.form.field.Display',{renderTo:this.getId()+'-inputEl-description'});},resetItem:function(){this.setRawValue(0);},setRawValue:function(value)
{var me=this;value=Ext.value(value,'');me.rawValue=value;if(me.rendered){this.loadInfo();}else{me.on('render',me.loadInfo,me);}
return value;},setValue:function(value){this.setRawValue(value);},loadInfo:function()
{if(this.getValue().length<1){return;}
Ext.Ajax.request({url:app.createUrl([app.admin,app.medialibControllerName,'info']),method:'post',scope:this,params:{id:this.getValue()},success:function(response,request){response=Ext.JSON.decode(response.responseText);if(response.success){this.setInfo(response.data);}},failure:function(){Ext.Msg.alert(appLang.MESSAGE,appLang.MSG_LOST_CONNECTION);}});},setInfo:function(data)
{me=this;if(data.exists){this.imageField.setValue(data.icon);this.descriptionField.setValue('<b>'+appLang.TITLE+':</b> '+data.title+'<br>'+'<b>'+appLang.SIZE+':</b> '+data.size+'<br>'+'<b>'+appLang.TYPE+':</b> '+data.type);}else{this.imageField.setValue(app.wwwRoot+'i/system/empty.gif');this.descriptionField.setValue('');}},selectItem:function(){var win=Ext.create('app.selectMediaItemWindow',{actionType:'selectId',resourceType:this.resourceType});win.on('itemSelected',function(record){if(Ext.isArray(record)){record=record[0];}
this.setValue(record.get('id'));win.close();},this);win.show();}});Ext.define('app.medialib.EditWindow',{extend:'Ext.Window',editForm:null,recordId:0,inited:0,mainGridId:'',viewFormId:'',cropButton:null,dataRec:null,showType:'select',constructor:function(config){config=Ext.apply({modal:true,layout:'fit',title:appLang.MODULE_MEDIALIB+' :: '+appLang.EDIT_ITEM,width:550,height:525,closeAction:'destroy',resizable:false},config||{});this.callParent(arguments);},loadData:function(){if(!this.recordId){return;}
var handle=this;this.editForm.getForm().load({url:app.admin+app.delimiter+'medialib'+app.delimiter+'getitem',method:'post',params:{'id':this.recordId},success:function(form,action){if(!action.result.success){return;}
if(action.result.data.type=="image"){handle.cropButton.show();}}});},saveData:function(){var handle=this;this.editForm.getForm().submit({clientValidation:true,waitTitle:appLang.SAVING,method:'post',url:app.admin+app.delimiter+'medialib'+app.delimiter+'update',success:function(form,action){if(action.result.success){handle.fireEvent('dataSaved');}else{Ext.Msg.alert(appLang.MESSAGE,action.result.msg);}},failure:app.formFailure});},setData:function(rec){this.dataRec=rec;this.editForm.getForm().loadRecord(this.dataRec);},initComponent:function(){this.cropButton=Ext.create('Ext.Button',{fieldLabel:appLang.CROP,text:appLang.CROP,hidden:true,anchor:false,width:70,listeners:{'click':{fn:function(){var win=Ext.create('app.medialib.CropWindow',{dataRec:this.dataRec});win.on('dataSaved',function(){if(!Ext.isEmpty(this.mainGridId)){Ext.getCmp(this.mainGridId).getStore().load();}
var date=new Date();if(!Ext.isEmpty(this.viewFormId)){Ext.getCmp(this.viewFormId).getForm().findField('thumbnail').setValue(this.dataRec.get('thumbnail')+'?'+Ext.Date.format(date,'Ymdhis'));}
this.editForm.getForm().findField('thumbnail').setValue(this.dataRec.get('thumbnail')+'?'+Ext.Date.format(date,'Ymdhis'));},this);win.show();win.maximize();},scope:this}}});this.editForm=Ext.create('Ext.form.Panel',{bodyPadding:5,border:false,bodyCls:'formBody',frame:false,fieldDefaults:{labelAlign:'right',labelWidth:100},defaults:{anchor:'100%'},items:[{fieldLabel:appLang.ID,name:"id",xtype:"hidden"},{xtype:'imagefield',fieldLabel:appLang.THUMBNAIL,name:'thumbnail',anchor:false,value:""},{xtype:'fieldcontainer',combineErrors:false,msgTarget:'under',hideLabel:false,layout:{type:'hbox',defaultMargins:{top:0,right:10,bottom:0,left:0}},items:[{width:94,xtype:'label'},this.cropButton]},{allowBlank:false,fieldLabel:appLang.TITLE,name:"title",xtype:"textfield"},{fieldLabel:appLang.ALTER_TEXT,name:"alttext",xtype:"textfield"},{fieldLabel:appLang.CAPTION,name:"caption",xtype:'htmleditor',enableAlignments:true,enableColors:true,enableFont:true,enableFontSize:true,enableFormat:true,enableLinks:false,enableLists:false,enableSourceEdit:false,height:120},{fieldLabel:appLang.DESCRIPTION,name:"description",xtype:"textarea",height:120}]});this.items=[this.editForm];this.buttons=[{text:appLang.SAVE,listeners:{click:{fn:function(){this.saveData();},scope:this}}},{text:appLang.CLOSE,listeners:{click:{fn:function(){this.close();},scope:this}}}];this.callParent(arguments);this.loadData();this.on('show',function(){app.checkSize(this);});}});Ext.define('app.medialib.CropWindow',{extend:Ext.Window,dataRec:null,coords:null,comboFld:null,jcrop:null,canEdit:false,canDelete:false,preview:null,centerRegion:null,constructor:function(config){config=Ext.apply({modal:true,layout:'border',title:appLang.MODULE_MEDIALIB+' :: '+appLang.CROP_IMAGE,width:600,height:500,closeAction:'destroy',resizable:true,maximizable:true,items:[],labelWidth:1,scrollable:true,tbar:[]},config||{});this.callParent(arguments);},setType:function(type)
{var imgPath=this.getImagePath(this.dataRec,type);$('#oldImage').attr('src',imgPath);$('#cropContainer').css('width',this.extList[type][0]+'px');$('#cropContainer').css('height',this.extList[type][1]+'px');this.jcrop.release();this.jcrop.destroy();var handle=this;this.jcrop=$.Jcrop('#cropSrc',{onChange:function(crds){handle.showPreview(crds,handle);},onSelect:function(crds){handle.showPreview(crds,handle);},aspectRatio:(handle.extList[type][0]/handle.extList[type][1])});},showPreview:function(cds,handle){if(parseInt(cds.w)<=0){return;}
handle.coords.x=cds.x;handle.coords.y=cds.y;handle.coords.w=cds.w;handle.coords.h=cds.h;var curImg=handle.comboFld.getValue();var rx=handle.extList[curImg][0]/cds.w;var ry=handle.extList[curImg][1]/cds.h;jQuery('#cropThumb').css({width:Math.round(rx*($('#cropSrc').attr('width')))+'px',height:Math.round(ry*($('#cropSrc').attr('height')))+'px',marginLeft:'-'+Math.round(rx*cds.x)+'px',marginTop:'-'+Math.round(ry*cds.y)+'px'});},crop:function(){var handle=this;Ext.Ajax.request({url:app.admin+app.delimiter+'medialib'+app.delimiter+'crop',method:'post',waitMsg:appLang.SAVING,params:{'type':this.comboFld.getValue(),'id':this.dataRec.get('id'),'x':this.coords.x,'y':this.coords.y,'w':this.coords.w,'h':this.coords.h},success:function(response,request){response=Ext.JSON.decode(response.responseText);if(response.success){var curImg=handle.comboFld.getValue();var src=handle.getImagePath(handle.dataRec,curImg);$('#oldImage').attr('src',src);handle.fireEvent('dataSaved');}else{Ext.MessageBox.alert(appLang.MESSAGE,response.msg);}}});},initComponent:function()
{this.coords={x:0,y:0,w:0,h:0};this.extList=app.mediaConfig.image.sizes;var imgSrc=this.dataRec.get('path');var cbItems=[];this.extList=app.mediaConfig.image.sizes;for(i in this.extList)
{if(typeof i=='function'){continue;}
cbItems.push({title:i+' ('+this.extList[i][0]+'x'+this.extList[i][1]+')',id:i});}
this.comboFld=Ext.create('Ext.form.field.ComboBox',{remote:false,allowBlank:false,queryMode:"local",forceSelection:true,triggerAction:"all",valueField:"id",displayField:'title',value:'medium',store:Ext.create('Ext.data.Store',{model:'app.comboStringModel',data:cbItems})});var north=Ext.create('Ext.Panel',{layout:'fit',title:appLang.IMAGE_SIZE,region:'north',items:[this.comboFld]});var curImg=this.comboFld.getValue();this.preview=Ext.create('Ext.Panel',{layout:'vbox',region:'center',bodyCls:'formBody',title:appLang.PREVIEW,defaults:{border:false,bodyCls:'formBody'},items:[{html:appLang.OLD_IMAGE,width:100},{bodyCls:'formBody',html:'<div id="oldContainer" style="width:'+this.extList[curImg][0]+'px;height:'+this.extList[curImg][1]+'px;overflow:hidden;"><img src="'+this.getImagePath(this.dataRec,curImg)+'" id="oldImage"  style="border:1px solid #000" /></div>'},{html:appLang.NEW_IMAGE,width:100},{html:'<div id="cropContainer" style="border:1px solid #000000; width:'+this.extList[curImg][0]+'px;height:'+this.extList[curImg][1]+'px;overflow:hidden;"><img src="'+imgSrc+'" id="cropThumb"  style="border:1px solid #000" /></div>'}]});this.centerRegion=Ext.create('Ext.Panel',{region:'center',scrollable:true,xtype:'panel',frame:true,html:'<img src="'+imgSrc+'" id="cropSrc"  style="border:1px solid #000" />'});this.items=[this.centerRegion,{region:'east',xtype:'panel',split:true,width:this.extList[curImg][0]+6,frame:false,layout:'border',items:[north,this.preview]}];this.buttons=[{text:appLang.CROP,listeners:{click:{fn:function(){if(this.coords.w<0){Ext.Msg.alert(appLang.MESSAGE,appLang.MSG_SELECT_CROP_REGION);return false;}
this.crop();},scope:this}}},{text:appLang.CLOSE,listeners:{click:{fn:function(){this.close();},scope:this}}}];this.comboFld.on('select',function(combo,value,options){this.setType(combo.getValue());},this);this.on('show',function(){var handle=this;setTimeout(function(){handle.jcrop=$.Jcrop('#cropSrc',{onChange:function(crds){handle.showPreview(crds,handle);},onSelect:function(crds){handle.showPreview(crds,handle);},aspectRatio:(handle.extList[curImg][0]/handle.extList[curImg][1])});},1000);},this);this.callParent(arguments);this.on('show',function(){app.checkSize(this);});},getImagePath:function(imageRecord,type){var date=new Date();return imageRecord.get('srcpath')+'-'+type+imageRecord.get('ext')+'?d='+Ext.Date.format(date,'ymdhis');}});