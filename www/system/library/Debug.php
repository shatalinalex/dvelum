<?php
class Debug
{
	/**
	 * Script startup time
	 * @var float
	 */
	protected static $_scriptStartTime = false;
	/**
	 * Database profiler
	 * @var Zend_Db_Profiler
	 */
	static protected  $_dbProfiler = false;	
	static protected  $_timers = array();
	static protected  $_loadedClasses = array();
	
	static protected  $_cacheCores = array();
	
	static public function setCacheCores(array $data)
	{
		self::$_cacheCores = $data;
	}

	static public function setScriptStartTime($time)
	{
		self::$_scriptStartTime = $time;
	}

	static public function setDbProfiler(Zend_Db_Profiler $profiler)
	{
		self::$_dbProfiler = $profiler;
	}
	
	static public function setLoadedClasses(array $data)
	{
		self::$_loadedClasses = $data;
	}

	/**
	 * Get debug information
	 * @return string  - html formated results
	 */
	static public function getStats($showCacheQueries = true , $showQueries = false , $showAutoloaded = false , $showInclided = false)
	{
		
		$str = '';
		
		if(self::$_scriptStartTime)
			$str .= '<b>Time:</b> ' . number_format((microtime(true) - self::$_scriptStartTime) , 5) . "sec.<br>\n";
		
		$str .= '<b>Memory:</b> ' . number_format((memory_get_usage() / (1024 * 1024)) , 3) . "mb<br>\n" . '<b>Memory peak:</b> ' . number_format((memory_get_peak_usage() / (1024 * 1024)) , 3) . "mb<br>\n" . '<b>Includes:</b> ' . sizeof(get_included_files()) . "<br>\n" . '<b>Autoloaded:</b> ' . sizeof(self::$_loadedClasses) . "<br>\n";
		

		if(self::$_dbProfiler)
		{
			$str .= '<b>Queries:</b> ' . self::$_dbProfiler->getTotalNumQueries() . '<br>' . '<b>Queries time:</b> ' . number_format(self::$_dbProfiler->getTotalElapsedSecs() , 5) . 'sec.<br>';
			if($showQueries)
			{
				$profiles = self::$_dbProfiler->getQueryProfiles();
				if(!empty($profiles))
					foreach($profiles as $queryProfile)
						$str .= "\n<br> " . $queryProfile->getQuery();
			}
			$str .= "<br>\n";
		}
		if($showAutoloaded)
			$str .= "<b>Autoloaded:</b>\n<br> " . implode("\n\t <br>" , self::$_loadedClasses) . '<br>';
		if($showInclided)
			$str .= "<b>Includes:</b>\n<br> " . implode("\n\t <br>" , get_included_files());
		

		if(!empty(self::$_cacheCores) && self::$_cacheCores)
		{
		    $body= '';	    
		    $globalCount = array('load'=>0,'save'=>0 ,'remove'=>0,'total'=>0);	    
		    $globalTotal = 0;
		    
			foreach (self::$_cacheCores as $name=>$cacheCore)
			{	
				if(!$cacheCore)
					continue;
				
				$count = $cacheCore->getOperationsStat();
				
				$count['total'] = $count['load'] + $count['save'] + $count['remove'];
				
				$globalCount['load']+=  $count['load'];
				$globalCount['save']+=  $count['save'];
				$globalCount['remove']+=$count['remove'];
				$globalCount['total']+= $count['total'];

				$body.= '
				    <tr align="right">
				        <td align="left" >'.$name.'</td>
				    	<td>'.$count['load'].'</td>
						<td>'.$count['save'].'</td>
						<td>'.$count['remove'].'</td>
						<td style="border-left:2px solid #000000;">'.$count['total'].'</td>
				    </tr>';

			}
			
			$body.= '
				    <tr align="right" style="border-top:2px solid #000000;">
				        <td align="left" >Total</td>
				    	<td>'.$globalCount['load'].'</td>
						<td>'.$globalCount['save'].'</td>
						<td>'.$globalCount['remove'].'</td>
						<td style="border-left:2px solid #000000;">'.$globalCount['total'].'</td>
				    </tr>';
			
			 $str.= '<div style=" padding:1px;"> <center><b>Cache</b></center>
				<table cellpadding="2" cellspacing="2" border="1" style="font-size:10px;">
					<tr style="background-color:#cccccc;font-weight:bold;">
						<td>Name</td>
						<td>Load</td>
						<td>Save</td>
						<td>Remove</td>
						<td style="border-left:2px solid #000000;">Total</td>
					</tr>
					'.$body.'
			 	</table>
			 </div>';
		}	
		
			
		return '<div id="debugPanel" style="position:fixed;font-size:12px;left:10px;bottom:10px;overflow:auto;max-height:300px;padding:5px;background-color:#ffffff;z-index:1000;border:1px solid #cccccc;">' . $str . ' <center><a href="javascript:void(0)" onClick="document.getElementById(\'debugPanel\').style.display = \'none\'">close</a></center></div>';
	}

	/**
	 * Start timer
	 * @param string $name
	 */
	static public function startTimer($name)
	{
		self::$_timers[$name] = array(
				'start' => microtime(true) , 
				'stop' => 0
		);
	}

	/**
	 * Stop timer
	 * @param string $name
	 * @return float time elapsed 
	 */
	static public function stopTimer($name)
	{
		if(!isset(self::$_timers[$name]))
			return 0;
		
		self::$_timers[$name]['stop'] = microtime(true);
		return self::$_timers[$name]['stop'] - self::$_timers[$name]['start'];
	}

	/**
	 * Get time
	 * @param string $timer
	 * @return float time elapsed 
	 */
	static public function getTimerTime($timer)
	{
		if(!isset(self::$_timers[$timer]))
			return 0;
		
		if(!self::$_timers[$timer]['stop'])
			return self::stopTimer($timer);
		
		self::$_timers[$timer]['stop'] = microtime(true);
		return self::$_timers[$timer]['stop'] - self::$_timers[$timer]['start'];
	}

}