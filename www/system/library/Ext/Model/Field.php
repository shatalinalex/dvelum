<?php
/**
 * Model field
 * @deprecated
 */
class Ext_Model_Field
{
	public $name;
	public $type;
	public $defaultValue;
	
	public function __construct($name , $type , $defaultValue = null)
	{
		$this->name = $name;
		$this->type = $type;
		$this->defaultValue = $defaultValue;
	}
}