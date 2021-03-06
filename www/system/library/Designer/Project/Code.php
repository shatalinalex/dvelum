<?php
/*
 * DVelum project http://code.google.com/p/dvelum/ , http://dvelum.net
 * Copyright (C) 2011-2013  Kirill A Egorov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
class Designer_Project_Code
{
    static public $NEW_INSTANCE_TOKEN = '[new:]';

    protected $storesApplied = false;
	/**
	 * @var Designer_Project
	 */
	protected $_project;

	public function __construct(Designer_Project $project)
	{
		$this->_project = $project;
	}

	public function __toString()
	{
		return $this->getCode();
	}

	/**
	 * Get project code
	 */
	public function getCode()
	{
        $this->applyStoreInstances();
		$code = $this->_compileJs(0);
		return '
		Ext.ns("' . $this->_project->namespace . '","' . $this->_project->runnamespace . '");
		' . $code['defines'] . '
	    ' . $code['layout'];
	}

    /**
	 * Update store property for all objects. Find instance token, update namespace
	 */
	protected function applyStoreInstances()
	{
	  if($this->storesApplied)
	    return;

	  $items = $this->_project->getObjects();

	  foreach ($items as $k=>$v)
	  {
	  	 if(method_exists($v, 'getViewObject')){
	  	 	$o = $v->getViewObject();

	  	 	if($o->isValidProperty('store')){
	  	 		$store = trim($o->store);
	  	 		if(strpos($store , Designer_Project_Code::$NEW_INSTANCE_TOKEN) !==false){
	  	 			$o->store = 'Ext.create("'.Ext_Code::appendNamespace(trim(str_replace(Designer_Project_Code::$NEW_INSTANCE_TOKEN, '', $store))).'",{})';
	  	 		}elseif (strlen($store)){
	  	 			$o->store = Ext_Code::appendRunNamespace($store);
	  	 		}
	  	 	}
	  	 }

	     if($v->isValidProperty('store')){
	       $store = trim($v->store);
	       if(strpos($store , Designer_Project_Code::$NEW_INSTANCE_TOKEN) !==false){
	         $v->store = 'Ext.create("'.Ext_Code::appendNamespace(trim(str_replace(Designer_Project_Code::$NEW_INSTANCE_TOKEN, '', $store))).'",{})';
	       }elseif (strlen($store)){
	         $v->store = Ext_Code::appendRunNamespace($store);
	       }
	     }
	  }

	  $this->storesApplied = true;
	}

	protected function _compileJs($parent)
	{
		$definesCode = '';
		$layoutCode = '';
		$items = array();
		$docked = array();
		$menu = array();

		/*
		 * Compile Models and Stores primarily for root node
		 */
		if($parent === 0)
		{
			$models = $this->_project->getModels();

			if(!empty($models))
				foreach ($models as $id=>$item)
					$definesCode.= $this->getObjectDefineJs($id);

			$stores = $this->_project->getStores();
			if(!empty($stores))
			{
				foreach ($stores as  $id=>$item)
				{
					if($item->isExtendedComponent()){

						$definesCode.= $this->getObjectDefineJs($id);

					    if($item->getConfig()->defineOnly)
					        continue;
					}

					$layoutCode.=  $this->getObjectLayoutCode($id);
				    $items[] = $this->_project->runnamespace . '.' . $item->getName();
				}
			}
		}

		if($this->_project->hasChilds($parent))
		{
			$childs = $this->_project->getChilds($parent);

			foreach($childs as $k => $item)
			{
				$itemObject = $item['data'];
				$oClass = $item['data']->getClass();
			    /*
				 * Skip Stores amd Models
				 */
				if($oClass === 'Store' || $oClass==='Model' || $oClass==='Data_Store' || $oClass==='Data_Store_Tree'){
					continue;
				}

				if($itemObject->isExtendedComponent() || in_array($oClass , Designer_Project::$defines , true) || Designer_Project::isWindowComponent($oClass))
				{
					$result = $this->_compileExtendedItem($item['id'] , $item['id']);
					$definesCode.= $result['defines'];
					continue;
				}

				switch($oClass)
				{
					case 'Docked' :

									if(!$this->_project->hasChilds($item['id']))
										continue;

									$result = $this->_compileItem($item['id']);
									$layoutCode .= $result['layout'];
									/*
								     * Only last Ext_Docked object will be processed
									 */
									$docked = $this->_project->runnamespace . '.' . $itemObject->getName();
						break;

					case 'Menu' :
            					    if(!$this->_project->hasChilds($item['id']))
            					    	continue;

            					    $menu = $this->_compileConfig($item['id']);
                        break;

					default:
									$result = $this->_compileItem($item['id']);
									$layoutCode .= $result['layout'];
									$items[] = $this->_project->runnamespace . '.' . $itemObject->getName();


					break;

				}

			}
		}

		if($parent !== 0)
		{
			$parentObject = $this->_project->getItemData($parent);

			if(!empty($items) && $parentObject->isValidProperty('items'))
				$parentObject->items = Utils_String::addIndent("[\n" . Utils_String::addIndent(implode(",\n" , $items)) . "\n]\n");

			if(!empty($docked) && $parentObject->isValidProperty('dockedItems'))
				$parentObject->dockedItems = $docked;

			if(!empty($menu) && $parentObject->isValidProperty('menu'))
				$parentObject->menu = $menu;
		}

		return array(
			'defines' => $definesCode ,
			'layout' => $layoutCode
		);
	}

	/**
	 * Get object define code
	 * @param string $id - object id
	 * @return string
	 */
	public function getObjectDefineJs($id)
	{
		$eventManager = $this->_project->getEventManager();
		$objectEvents = $eventManager->getObjectEvents($id);
		$object = $this->_project->getObject($id);

		if(!empty($objectEvents))
		{
			$eventsConfig = $object->getConfig()->getEvents()->__toArray();

			foreach ($objectEvents as $event => $config)
			{
			    if(empty($config['code']))
			      continue;

				$params = '';

				if(isset($eventsConfig[$event]))
					$params = implode(',', array_keys($eventsConfig[$event]));
				elseif(is_array($config['params']) && !empty($config['params']))
				    $params = implode(',', array_keys($config['params']));

				$object->addListener($event ,Utils_String::addIndent("{\n".Utils_String::addIndent("fn:function(".$params."){\n".Utils_String::addIndent($config['code'])."\n},\nscope:this")."\n}",2,"\t",true));
			}
		}

		if($object->isExtendedComponent())
		{
		  $manager = $this->_project->getMethodManager();
		  $objectMethods = $manager->getObjectMethods($id);
		  if(!empty($objectMethods)){
		    foreach ($objectMethods as $name => $method){
		      $object->addMethod($name, $method->getParamsLine(), $method->getCode(), $method->getJsDoc());
		    }
		  }

		  $manager = $this->_project->getEventManager();
		  $localEvents = $manager->getLocalEvents($object->getName());

		  if(!empty($localEvents))
		  {
		    foreach ($localEvents as $name=>$info)
		    {
		      $params = '';
		      $doc = "/**\n * @event ".$name;
		      if(!empty($info['params']) && is_array($info['params']))
		      {
		        $params = implode(' , ' , array_keys($info['params']));
		        foreach ($info['params'] as $key=>$type)
		          $doc.= "\n * @param ".$type." ".$key;
		      }
		      $doc.="\n */";
		      $object->addLocalEvent($name , $params , $doc);
		    }
		  }
		}
		/**
		 * Convert ActionColumn listeners
		 */
		if($object->getClass() === 'Grid'){
			$this->_applycolumnEvents($object);
			$this->_applyFiltersEvents($object->getFiltersFeature());
		}
		return $this->_project->getObject($id)->getDefineJs($this->_project->namespace);
	}

	/**
	 * Get object js code for layout
	 * @param string $id - object id
	 * @return string
	 */
	public function getObjectLayoutCode($id)
	{

		$object = $this->_project->getObject($id);
		$oClass = $object->getClass();

		$eventManager = $this->_project->getEventManager();
		$objectEvents = $eventManager->getObjectEvents($id);

		if(!empty($objectEvents))
		{
			$eventsConfig = $object->getConfig()->getEvents()->__toArray();

			foreach ($objectEvents as $event => $config)
			{
				$params = '';
				if(isset($eventsConfig[$event]))
					$params = implode(',', array_keys($eventsConfig[$event]));


				if($event === 'handler')
					$object->addListener($event ,"function(".$params."){\n".Utils_String::addIndent($config['code'],2)."\n}");
				else
					$object->addListener($event ,"{\n\t\t\tfn:function(".$params."){\n".Utils_String::addIndent($config['code'],2)."\n},\n\t\t\tscope:this\n\t\t}\n");
			}
		}

		/**
		 * Convert ActionColumn listeners
		 */
		if($oClass === 'Grid'){
			$this->_applycolumnEvents($object);
			$this->_applyFiltersEvents($object->getFiltersFeature());
		}

		switch($oClass)
		{
			case 'Docked' :
									return "\n".Ext_Code::appendRunNamespace($object->getName()) . ' = ' . Utils_String::addIndent($object->__toString(),1,"\t",true) . ';' . "\n";
					break;

			case 'Component_Filter':
									return "\n".Ext_Code::appendRunNamespace($object->getName()) . ' = Ext.create("' .
										$object->getViewObject()->getConfig()->getExtends() . '",' .
										Utils_String::addIndent($object->__toString()) . "\n" .
									');' . "\n";
					break;

			case 'Menu':
			                     return "\n".Ext_Code::appendRunNamespace($object->getName()) . ' = ' . Utils_String::addIndent($object->__toString(),1,"\t",true) . ';' . "\n";

			    break;


			default :
			               if($object->isInstance())
			               {

			                 return "\n".Ext_Code::appendRunNamespace($object->getName()) . ' = Ext.create("' .
			                     Ext_Code::appendNamespace($object->getObject()->getName()) . '",' .
			                     Utils_String::addIndent($object->__toString())."\n".
			                     ');' . "\n";

			               }else{

							   if($object->isExtendedComponent()){
								   return "\n".Ext_Code::appendRunNamespace($object->getName()) . ' = Ext.create("' .
								   Ext_Code::appendNamespace($object->getName()) . '",{});' . "\n";
							   }else{
								   return "\n".Ext_Code::appendRunNamespace($object->getName()) . ' = Ext.create("' .
								   $object->getConfig()->getExtends() . '",' .
								   Utils_String::addIndent($object->__toString())."\n".
								   ');' . "\n";
							   }
			               }

					break;

		}
	}

	/**
	 * Add listeners for actioncolumn's
	 * @param Ext_Grid $grid
	 */
	protected function _applycolumnEvents(Ext_Grid $grid)
	{
		$columns = $grid->getColumns();

		if(empty($columns))
			return;

		$eventManager = $this->_project->getEventManager();

		foreach ($columns as $k=>$v)
		{
			if(is_object($v['data']->editor))
			    $this->_convertColumnEditorActions($v['data']);

			if($v['data']->getClass()==='Grid_Column_Action')
				$this->_convertColumnActions($v['data']);
		}
	}
	/**
	 * Add listeners for filters feature
	 * @param Ext_Grid_Filtersfeature $filter
	 */
	protected function _applyFiltersEvents(Ext_Grid_Filtersfeature $filter)
	{
	  $filters = $filter->getFilters();

	  if(empty($filters))
	      return;

	  foreach ($filters as $k=>$v)
	     if($v instanceof Ext_Grid_Filter)
	        $this->_convertFilterEvents($v);

	}
	/**
	 * Apply filter events
	 * @param Ext_Grid_Filter $filter
	 */
	protected function _convertFilterEvents(Ext_Grid_Filter $filter)
	{
	  $eventManager = $this->_project->getEventManager();
	  $eventsConfig = $filter->getConfig()->getEvents()->__toArray();
	  $filterEvents = $eventManager->getObjectEvents($filter->getName());

	  if(empty($filterEvents))
	      return;

	  foreach ($filterEvents as $event =>$config)
	  {
	      if(!strlen($config['code']))
	          continue;

	      $params = '';
	      if(isset($eventsConfig[$event]))
	          $params = implode(',', array_keys($eventsConfig[$event]));

	      $filter->addListener($event , "{".Utils_String::addIndent("\n\tfn:function(".$params."){\n".Utils_String::addIndent($config['code'],3)."\n\t},\n\tscope:this\n",2)."}");
	  }
	}

	/**
	 * Convert listeners for actioncolumn
	 * @param Ext_Grid_Column_Action $column
	 */
	protected function _convertColumnActions(Ext_Grid_Column_Action $column)
	{
		 $actions = $column->getActions();

		 if(empty($actions))
		 	return;

	 	$eventManager = $this->_project->getEventManager();


	 	foreach($actions as $object)
	 	{
	 		$eventsConfig = $object->getConfig()->getEvents()->__toArray();
	 		$colEvents = $eventManager->getObjectEvents($object->getName());

	 		if(empty($colEvents))
	 			continue;

	 		foreach ($colEvents as $event =>$config)
	 		{
				if(!strlen($config['code']))
				  continue;

	 			$params = '';
				if(isset($eventsConfig[$event]))
					$params = implode(',', array_keys($eventsConfig[$event]));


				$object->addListener($event ,"function(".$params."){\n".Utils_String::addIndent($config['code'],2)."\n}");
				$object->scope = 'this';
	 		}
	 	}
	}

	/**
	 * Convert listeners for column editor
	 * @param Ext_Grid_Column $column
	 */
	protected function _convertColumnEditorActions(Ext_Grid_Column $column)
	{
		$object = $column->editor;

		$eventManager = $this->_project->getEventManager();

		$eventsConfig = $object->getConfig()->getEvents()->__toArray();
		$editorEvents = $eventManager->getObjectEvents($object->getName());

		if(empty($editorEvents))
			return;

		foreach ($editorEvents as $event =>$config)
		{
		  if(!strlen($config['code']))
		      continue;

			$params = '';
			if(isset($eventsConfig[$event]))
				$params = implode(',', array_keys($eventsConfig[$event]));


			$object->addListener($event ,"{\n".Utils_String::addIndent("fn:function(".$params."){\n".Utils_String::addIndent($config['code'],2)."\n},\n".Utils_String::addIndent("scope:this\n"),2)."}");
		}
	}

	/**
	 * Conpile object
	 * @param string $id
	 * @return array()
	 */
	protected function _compileItem($id)
	{
		$object = $this->_project->getObject($id);

		if($object->getClass() === 'Component_Field_System_Medialibhtml')
		{
			/**
			 * @todo Уменьшить связанность
			 */
			Resource::getInstance()->addJs('/js/lib/jquery.js'  , 1);
			Model::factory('Medialib')->includeScripts();
		}

		$code = array('defines'=>'','layout'=>'');
		$code = $this->_compileJs($id);

		$definesCode = $code['defines'];
		$layoutCode = $code['layout'];

		$layoutCode.= $this->getObjectLayoutCode($id);

		return array(
				'layout' => $layoutCode ,
				'defines' => $definesCode
		);
	}

	/**
	 * Compile object as Config
	 * @param string $name
	 */
	protected function _compileConfig($name)
	{
		$o = $this->_project->getObject($name);
		$menu = '';
		$docked = '';
		$items = array();

		$eventManager = $this->_project->getEventManager();
		$objectEvents = $eventManager->getObjectEvents($name);

		if(!empty($objectEvents))
		{
			$eventsConfig = $o->getConfig()->getEvents()->__toArray();

			foreach ($objectEvents as $event => $config)
			{
				$params = '';
				if(isset($eventsConfig[$event]))
					$params = implode(',', array_keys($eventsConfig[$event]));

				if($event === 'handler')
					$o->addListener($event ,"function(".$params."){\n".Utils_String::addIndent($config['code'],2)."\n}");
				else
					$o->addListener($event ,"{\n\t\t\tfn:function(".$params."){\n".Utils_String::addIndent($config['code'],4)."\n\t\t\t},\n\t\t\tscope:this\n\t\t}\n");
			}
		}


		if($this->_project->hasChilds($name))
		{
			$childs = $this->_project->getChilds($name);

		    foreach($childs as $k => $item)
			{
				$itemObject = $item['data'];
				$oClass = $item['data']->getClass();

				switch($oClass)
				{
					case 'Docked' :

									if(!$this->_project->hasChilds($item['id']))
										continue;

									$docked = $this->_compileConfig($item['id']);
						break;

					case 'Menu' :
            					    if(!$this->_project->hasChilds($item['id']))
            					    	continue;

            					    $menu = $this->_compileConfig($item['id']);


					default:
									$items[] =  $this->_compileConfig($item['id']);

						break;
				}

			}
		}

 		if(!empty($items) && $o->isValidProperty('items'))
 			$o->items = Utils_String::addIndent("[\n" . Utils_String::addIndent(implode(",\n" , $items)) . "\n]\n");

 		if(!empty($docked) && $o->isValidProperty('dockedItems'))
 			$o->dockedItems = $docked;

		if(!empty($menu) && $o->isValidProperty('menu'))
			$o->menu = $menu;

		return $o;
	}

	protected function _compileExtendedItem($id , $parent)
	{
		$object = $this->_project->getItemData($id);
		$hasChilds = $this->_project->hasChilds($parent);

		if($object->isValidProperty('items') && $hasChilds)
			$this->_compileExtendedSubItems($id , $id);

		$definesCode = $this->getObjectDefineJs($id);

		return array(
				'layout' => '' ,
				'defines' => $definesCode
		);
	}

	protected function _compileExtendedSubItems($parent , $mainContainer)
	{
		if(!$this->_project->hasChilds($parent))
			return array();

		$mainContainerObject = $this->_project->getItemData($mainContainer);

		$eventManager = $this->_project->getEventManager();

		$childs = $this->_project->getChilds($parent);

		$items = array();
		$docked = array();
		$menu = array();

		foreach($childs as $k => $item)
		{
			if($this->_project->hasChilds($item['id']))
				$this->_compileExtendedSubItems($item['id'] , $mainContainer);

			$itemName = 'me.childObjects.' . $item['id'];

			switch ($item['data']->getClass()){

				case 'Docked' :
            					if(!$this->_project->hasChilds($item['id']))
            						continue;

            					$docked[] = $item['data'];
					break;

				case 'Menu' :

            				    if(!$this->_project->hasChilds($item['id']))
            				    	continue;

            				    $menu[] = $item['data'];
				    break;

				default: $items[] = $itemName;
					break;
			}


			$objectEvents = $eventManager->getObjectEvents($item['id']);

			if(!empty($objectEvents))
			{
				$eventsConfig = $item['data']->getConfig()->getEvents()->__toArray();

				foreach ($objectEvents as $event => $config)
				{
				  if(empty($config['code']))
				    continue;

					$params = '';
					if(isset($eventsConfig[$event]))
						$params = implode(',', array_keys($eventsConfig[$event]));

					if($event === 'handler')
					{
						$item['data']->addListener($event ,"function(".$params."){\n".Utils_String::addIndent($config['code'],2)."\n}");
						$item['data']->scope = 'this';
					}
					else
						$item['data']->addListener($event ,"{\n".Utils_String::addIndent("fn:function(".$params."){\n".Utils_String::addIndent($config['code'],2)."\n},\n" . Utils_String::addIndent("scope:this")."\n}" , 2)."\n");
				}
			}

			$mainContainerObject->addElement($itemName , $item['data']);

			/**
			 * Convert ActionColumn listeners
			 */
			if($item['data']->getClass() === 'Grid'){
				$this->_applycolumnEvents($item['data']);
				$this->_applyFiltersEvents($item['data']->getFiltersFeature());
			}
		}

		if($parent!=='0')
		{
			$container = $this->_project->getItemData($parent);

			if(!empty($items))
				$container->items = "[\n" . Utils_String::addIndent(implode(",\n" , $items),1) . "\n]\n";

			if(!empty($docked))
				$container->dockedItems = implode(',' , $docked);

			if(!empty($menu))
				$container->menu = implode(',' , $menu);
		}

	}

	/**
	 * Get object javascript source code
	 * @param string $name
	 * @return string
	 */
	public function getObjectCode($name)
	{
		if(!$this->_project->objectExists($name))
			return '';

		$this->applyStoreInstances();

		$object = $this->_project->getObject($name);
		$oClass = $object->getClass();

		if(in_array($oClass , Designer_Project::$defines , true) || $object->isExtendedComponent())
			$code = $this->_compileExtendedItem($name , 0);
		else
			$code = $this->_compileItem($name);

		return $code['defines'] . "\n" . $code['layout'];
	}
}