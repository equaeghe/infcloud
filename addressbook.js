/*
InfCloud - the open source CalDAV/CardDAV Web Client
Copyright (C) 2011-2015
    Jan Mate <jan.mate@inf-it.com>
    Andrej Lezo <andrej.lezo@inf-it.com>
    Matej Mihalik <matej.mihalik@inf-it.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

// AddressbookList Class
function AddressbookList()
{
	this.contacts=new Array();
	this.contacts_hash=new Object();
	this.contacts_hash_uidattr=new Object();
	this.companies=new Array();
	this.companies_hash=new Object();
	this.companies_hash_uidattr=new Object();
	this.vcard_groups=new Object();
	this.contact_categories=new Object();
	this.contact_companies=new Object();
	this.contactLoaded=null;
	this.contactToReload=null;
	this.vcardGroupLoaded=null;

	this.reset=function()
	{
		this.contacts.splice(0,this.contacts.length);
		this.contacts_hash=new Object();
		this.contacts_hash_uidattr=new Object();
		this.companies.splice(0,this.companies.length);
		this.companies_hash=new Object();
		this.companies_hash_uidattr=new Object();
		this.vcard_groups=new Object();	// these are not removed from the interface (it's OK)
		this.contact_categories=new Object();
		this.contact_companies=new Object();
		this.contactLoaded=null;
		this.contactToReload=null;
		this.vcardGroupLoaded=null;
	}

	this.getNewUID=function()
	{
		// we count with uniqueness of generated hash string
		var newUID=null;
		newUID=generateUID();
		return newUID;
	}

	this.getLoadedContactUID=function()
	{
		if(this.contactLoaded!=null)
			return this.contactLoaded.uid;
		else
			return '';
	}

	this.getSortKey=function(inputContact, inputSettings, inputMode)	// inputMode (0=sort, 1=display)
	{
		/* backward compatibility for stupid users (remove it in future) */
		if(typeof inputSettings=='string')
			var tmp=inputSettings.replace(RegExp(',','g'), ', ').split(',');
		else	/* new configuration options (arrays) */
			var tmp=inputSettings.slice();	// copy the configuration array

		var sortKeyCompanyPart='';
		if(typeof (getCRMSortKey)== 'function' && inputMode==0)
		{
			sortKeyCompanyPart=getCRMSortKey(inputContact);
			if(inputContact.isCompany!=undefined && inputContact.isCompany)
				return sortKeyCompanyPart;	// for company contact we can return here
		}
		else if(typeof globalGroupContactsByCompanies!='undefined' && globalGroupContactsByCompanies==true)
		{
			var sortKeyCompanyPart='\u0009';
			var vcard_orgname=('\r\n'+inputContact.vcard).match(vCard.pre['contentline_ORG']);
			if(vcard_orgname!=null && vcard_orgname.length>0)	// if more than one ORG is present, use the first one
			{
				// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
				var parsed=vcard_orgname[0].match(vCard.pre['contentline_parse']);
				var parsed_value=vcardSplitValue(parsed[4], ';');

				sortKeyCompanyPart=parsed_value[0]+'\u0009'+(parsed_value[1]!=undefined ? parsed_value[1] : '')+'\u0009';

				if(inputMode==0 && inputContact.isCompany!=undefined && inputContact.isCompany)
					return sortKeyCompanyPart;	// for company contact we can return here
			}
		}
		if(globalSettings.collectiondisplayorg.value!=false)
		{
			// check for company vCard
			var vcard_contact_type=('\r\n'+inputContact.vcard).match(vCard.pre['X-ABShowAs']);
			if(vcard_contact_type!=null && vcard_contact_type.length>0)	// if more than one X-ABShowAs is present, use the first one
			{
				// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
				var parsed=vcard_contact_type[0].match(vCard.pre['contentline_parse']);
				if(parsed[4].toLowerCase()=='company')	// company vCard
				{
					var vcard_orgname=('\r\n'+inputContact.vcard).match(vCard.pre['contentline_ORG']);
					if(vcard_orgname!=null && vcard_orgname.length>0)	// if more than one ORG is present, use the first one
					{
						// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
						var parsed=vcard_orgname[0].match(vCard.pre['contentline_parse']);
						var parsed_value=vcardSplitValue(parsed[4],';');

						if(parsed_value[0]!='')
							return parsed_value[0];
					}
				}
			}
		}

		var vcard_element=('\r\n'+inputContact.vcard).match(vCard.pre['contentline_N']);
		if(vcard_element!=null && vcard_element.length==1)	// if the N attribute is not present exactly once, vCard is considered invalid
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			var parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			// parsed_value = [0]->Family, [1]->Given, [2]->Middle, [3]->Prefix, [4]->Suffix
			var parsed_value=vcardSplitValue(parsed[4],';');

			var first_found=false;
			for(var i=0;i<tmp.length;i++)
			{
				var tmp_found=false;
				if(tmp[i].match(IntProc['last'])!=null)
				{
					if(parsed_value[0]==undefined || parsed_value[0]=='')
						tmp[i]='';
					else
					{
						tmp[i]=tmp[i].replace((!first_found ? IntProc['_last'] : IntProc['last']),parsed_value[0]);
						first_found=true;
					}
				}
				else if(tmp[i].match(IntProc['first'])!=null)
				{
					if(parsed_value[1]==undefined || parsed_value[1]=='')
						tmp[i]='';
					else
					{
						tmp[i]=tmp[i].replace((!first_found ? IntProc['_first'] : IntProc['first']),parsed_value[1]);
						first_found=true;
					}
				}
				else if(tmp[i].match(IntProc['middle'])!=null)
				{
					if(parsed_value[2]==undefined || parsed_value[2]=='')
						tmp[i]='';
					else
					{
						tmp[i]=tmp[i].replace((!first_found ? IntProc['_middle'] : IntProc['middle']),parsed_value[2]);
						first_found=true;
					}
				}
				else if(tmp[i].match(IntProc['prefix'])!=null)
				{
					if(parsed_value[3]==undefined || parsed_value[3]=='')
						tmp[i]='';
					else
					{
						tmp[i]=tmp[i].replace((!first_found ? IntProc['_prefix'] : IntProc['prefix']),parsed_value[3]);
						first_found=true;
					}
				}
				else if(tmp[i].match(IntProc['suffix'])!=null)
				{
					if(parsed_value[4]==undefined || parsed_value[4]=='')
						tmp[i]='';
					else
					{
						tmp[i]=tmp[i].replace((!first_found ? IntProc['_suffix'] : IntProc['suffix']),parsed_value[4]);
						first_found=true;
					}
				}
			}
			sort_value=tmp.join('');

			if(sort_value=='')	// if no N value present, we use the FN instead
			{
				var vcard_element2=('\r\n'+inputContact.vcard).match(vCard.pre['contentline_FN']);
				if(vcard_element2!=null && vcard_element2.length==1)	// if the FN attribute is not present exactly once, vCard is considered invalid
				{
					// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
					var parsed=vcard_element2[0].match(vCard.pre['contentline_parse']);
					var sort_value=parsed[4];
				}
			}
			return (inputMode==0 ? sortKeyCompanyPart+sort_value : sort_value);
		}
		else
			return false;
	}

	this.isContactGroup=function(inputVcard)
	{
		var vcard_element=null;
		if((vcard_element=('\r\n'+inputVcard).match(vCard.pre['X-ADDRESSBOOKSERVER-KIND']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			var parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			if(parsed[4].toLowerCase()=='group')
				return true;
		}
		return false;
	}

	this.getMyContactGroups=function(inputUid)
	{
		if(this.contacts_hash[inputUid]!=undefined)
		{
			var myContactGroups=new Array();

			if((vcard_element=this.contacts_hash[inputUid].vcard.match(vCard.pre['contentline_UID']))!=null)
			{
				// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
				parsed=vcard_element[0].match(vCard.pre['contentline_parse']);

				for(var j=0;j<this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')].length;j++)
				{
					if(this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')][j].vcard.match(RegExp('\r\nX-ADDRESSBOOKSERVER-MEMBER:urn:uuid:'+parsed[4]+'\r\n','mi')))
						myContactGroups[myContactGroups.length]=this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')][j].uid;
				}
			}
			return myContactGroups;
		}
		else
			return null;
	}

	this.getRemoveMeFromContactGroups=function(inputUid, inputContactGroupsUidArr)
	{
		if(this.contacts_hash[inputUid]!=undefined)
		{
			var changedContactGroups=new Array();

			if((vcard_element=this.contacts_hash[inputUid].vcard.match(vCard.pre['contentline_UID']))!=null)
			{
				// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
				parsed=vcard_element[0].match(vCard.pre['contentline_parse']);

				for(var j=0;j<this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')].length;j++)
				{
					if(inputContactGroupsUidArr!=null)
					{
						var skipThis=true;
						for(var k=0;k<inputContactGroupsUidArr.length;k++)
							if(inputContactGroupsUidArr[k]==this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')][j].uid)
							{
								skipThis=false;
								break;
							}

						if(skipThis==true)
							continue;
					}

					var vcard=this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')][j].vcard;

					var changedVcard=null;
					if(vcard!=(changedVcard=vcard.replaceAll('\r\nX-ADDRESSBOOKSERVER-MEMBER:urn:uuid:'+parsed[4]+'\r\n','\r\n')))
					{
						// update the revision in the group vcard
						var d = new Date();
						utc=d.getUTCFullYear()+(d.getUTCMonth()+1<10 ? '0':'')+(d.getUTCMonth()+1)+(d.getUTCDate()<10 ? '0':'')+d.getUTCDate()+'T'+(d.getUTCHours()<10 ? '0':'')+d.getUTCHours()+(d.getUTCMinutes()<10 ? '0':'')+d.getUTCMinutes()+(d.getUTCSeconds()<10 ? '0':'')+d.getUTCSeconds()+'Z';
						changedVcard=changedVcard.replace(RegExp('\r\nREV:.*\r\n','mi'),'\r\nREV:'+utc+'\r\n');

						// "copy" of the original object
						changedContactGroups[changedContactGroups.length]=$.extend({},this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')][j]);
						// new modified vcard group
						changedContactGroups[changedContactGroups.length-1].vcard=changedVcard;
					}
				}
			}
			return changedContactGroups;
		}
		else
			return null;
	}

	this.getAddMeToContactGroups=function(inputContactObj, inputContactGroupsUidArr)
	{
		if(!(inputContactGroupsUidArr instanceof Array))
			inputContactGroupsUidArr=[inputContactGroupsUidArr];

		vcard_element=inputContactObj.vcard.match(vCard.pre['contentline_UID']);

		// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
		parsed=vcard_element[0].match(vCard.pre['contentline_parse']);

		var changedContactGroups=new Array();

		for(var j=0;j<this.vcard_groups[inputContactObj.uid.replace(RegExp('/[^/]*$',''),'/')].length;j++)
			for(var k=0;k<inputContactGroupsUidArr.length;k++)
				if(this.vcard_groups[inputContactObj.uid.replace(RegExp('/[^/]*$',''),'/')][j].uid==inputContactGroupsUidArr[k])
				{
					// if the uuid is already a member we remove it from contact-group to avoid duplicate membership
					var vcard=this.vcard_groups[inputContactObj.uid.replace(RegExp('/[^/]*$',''),'/')][j].vcard.replaceAll('\r\nX-ADDRESSBOOKSERVER-MEMBER:urn:uuid:'+parsed[4]+'\r\n','\r\n');
					var tmp=vcard.split('\r\n');
					tmp.splice(tmp.length-2,0,'X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:'+parsed[4]);
					var changedVcard=tmp.join('\r\n');

					var d = new Date();
					utc=d.getUTCFullYear()+(d.getUTCMonth()+1<10 ? '0':'')+(d.getUTCMonth()+1)+(d.getUTCDate()<10 ? '0':'')+d.getUTCDate()+'T'+(d.getUTCHours()<10 ? '0':'')+d.getUTCHours()+(d.getUTCMinutes()<10 ? '0':'')+d.getUTCMinutes()+(d.getUTCSeconds()<10 ? '0':'')+d.getUTCSeconds()+'Z';
					changedVcard=changedVcard.replace(RegExp('\r\nREV:.*\r\n','mi'),'\r\nREV:'+utc+'\r\n');

					// "copy" of the original object
					changedContactGroups[changedContactGroups.length]=$.extend({},this.vcard_groups[inputContactObj.uid.replace(RegExp('/[^/]*$',''),'/')][j]);
					// new modified vcard group	(normalisation is added to fix basic errors in invalid vCard)
					changedContactGroups[changedContactGroups.length-1].vcard=normalizeVcard(changedVcard);
				}
		return changedContactGroups;
	}

	// Contact group list is not sorted, instead "insert sort" is performed
	this.insertContactGroup=function(inputContact, forceReload, forceReinsert)
	{
		if((inputContact.sortkey=this.getSortKey(inputContact, ['last'], 0))===false || (inputContact.displayvalue=this.getSortKey(inputContact, ['last'], 1))===false)
			return false;	//invalid vcard

		var makeActive=null;
		var makeChecked=null;

		// do not insert entry with duplicate UID
		for(var i=0;i<this.vcard_groups[inputContact.uid.replace(RegExp('/[^/]*$',''),'/')].length;i++)
			if(this.vcard_groups[inputContact.uid.replace(RegExp('/[^/]*$',''),'/')][i].uid==inputContact.uid)
			{
				if(forceReinsert==false && this.vcard_groups[inputContact.uid.replace(RegExp('/[^/]*$',''),'/')][i].displayvalue==inputContact.displayvalue)
				{
					this.vcard_groups[inputContact.uid.replace(RegExp('/[^/]*$',''),'/')][i]=inputContact;
					return 0;
				}
				else
				{
					if($('#ResourceCardDAVList').find('[data-id='+jqueryEscapeSelector(inputContact.uid)+']').hasClass('resourceCardDAV_selected'))
						makeActive=inputContact.uid;

					if(dataGetChecked('#ResourceCardDAVList').indexOf(inputContact.uid)!=-1 || dataGetChecked('#ResourceCardDAVList').indexOf(inputContact.uid.replace(RegExp('/[^/]*$',''),'/'))!=-1)
						makeChecked=inputContact.uid;

					// the contact group name is changed and must be moved to correct place (we first remove it and then reinsert)
					this.removeContactGroup(inputContact.uid, false);
					break;
				}
			}

		// find the index where to insert the new contact group

		var insertIndex=this.vcard_groups[inputContact.uid.replace(RegExp('/[^/]*$',''),'/')].length;
		for(var i=0;i<this.vcard_groups[inputContact.uid.replace(RegExp('/[^/]*$',''),'/')].length;i++)
			if(this.vcard_groups[inputContact.uid.replace(RegExp('/[^/]*$',''),'/')][i].sortkey.customCompare(inputContact.sortkey,globalSortAlphabet,1,false)==1)
			{
				insertIndex=i;
				break;
			}

		// insert the contact group
		this.vcard_groups[inputContact.uid.replace(RegExp('/[^/]*$',''),'/')].splice(insertIndex, 0, inputContact);

		// insert the contact group to interface
		var newElement=globalTranslCardDAVListItem.find('.contact_group').find('.group').clone();
		// the onclick event is disabled until the last drag&drop operation is completed
		newElement.click(function(e){
			if(globalAddressbookCollectionsLoading)
				return true;
			if(e.shiftKey) {
				var uid = $(this).attr('data-id');
				$('#ResourceCardDAVList').find('.resourceCardDAV:visible').children('input[type="checkbox"]').each(function(){
					var currentUid = $(this).attr('data-id');
					$(this).prop({'checked':false, 'indeterminate':false}).attr('data-ind', 'true');
					collectionChBoxClick(this, '#ResourceCardDAVList', '.resourceCardDAV_header', '.resourceCardDAV', '.contact_group', false);
				});
				var checkbox = $(this).children('input[type="checkbox"]');
				checkbox.prop({'checked':true, 'indeterminate':false});
				groupChBoxClick(checkbox.get(0), '#ResourceCardDAVList', '.resourceCardDAV_header', '.resourceCardDAV', '.contact_group', false);
				globalAddressbookList.applyABFilter([uid], false);
			}
			globalResourceCardDAVList.resourceOrGroupClick(this.getAttribute('data-id'));
		});
		newElement.attr('data-id',inputContact.uid);
		newElement.find('.resourceCardDAVGroupColor').css('background-color', inputContact.color);

		// note: we need to check the group if the parent collection is checked (and we need to use .attr() instead of .prop() because the element is not in the DOM)
		var tmp_check=false;
		if($('#ResourceCardDAVList').find('[data-id='+jqueryEscapeSelector(inputContact.uid.replace(RegExp('[^/]*$',''),''))+']').find('input[type=checkbox]').prop('checked')==true && $('#ResourceCardDAVList').find('[data-id='+jqueryEscapeSelector(inputContact.uid.replace(RegExp('[^/]*$',''),''))+']').find('input[type=checkbox]').prop('indeterminate')==false)
			tmp_check=true;
		newElement.find('input[type=checkbox]').attr('checked', tmp_check).attr({'data-id': inputContact.uid, 'onclick': 'var evt=arguments[0]; evt.stopPropagation(); if($(this).parents(\':eq(2)\').find(\'[class^="r_"]\').length>0) return false; else globalAddressbookList.applyABFilter(groupChBoxClick(this, \'#ResourceCardDAVList\', \'.resourceCardDAV_header\', \'.resourceCardDAV\', \'.contact_group\', true), false);'});

		newElement.append(vcardUnescapeValue(inputContact.displayvalue));
		newElement.css('display','');
		if($('#ResourceCardDAVList').find('[data-id="'+jqueryEscapeSelector(inputContact.uid.replace(RegExp('/[^/]*$',''),'/'))+'"]').next('.contact_group').find('[data-id="'+jqueryEscapeSelector(inputContact.uid)+'"]').length==0)
			$('#ResourceCardDAVList').find('[data-id="'+jqueryEscapeSelector(inputContact.uid.replace(RegExp('/[^/]*$',''),'/'))+'"]').next('.contact_group').children().eq(insertIndex).after(newElement);

		// make the area droppable if the collection is not read-only
		if(globalResourceCardDAVList.getCollectionPrivByUID(inputContact.uid.replace(RegExp('[^/]*$',''),''))==false && (typeof globalDisableDragAndDrop=='undefined' || globalDisableDragAndDrop!=true))
			$('#ResourceCardDAVList').find('[data-id="'+jqueryEscapeSelector(inputContact.uid.replace(RegExp('[^/]*$',''),''))+'"]').parent().find('.contact_group').children().eq(insertIndex+1).droppable({
				accept: '.ablist_item',
				tolerance: 'pointer',
				hoverClass: 'group_dropped_to',
				drop: function(event, ui){
					// animate the clone of the dropped (draggable) element
					var tmp=ui.helper.clone();
					tmp.appendTo('body')
					.animate({opacity: 0, color: 'transparent', height: 0, width: 0, fontSize: 0, lineHeight: 0, paddingLeft: 0, paddingRight: 0},750,function(){tmp.remove()});

					// disallow to drag the original dropped element until the processing is finished
					ui.draggable.draggable('option', 'disabled', true);

					// animate the original dropped element
					ui.draggable.animate({opacity: 0.3}, 750);

					// disallow to drop any new element until the processing is finished
					$(this).droppable('option', 'disabled', true);

					// show the loader icon
					$(this).addClass('r_operate');

					var tmp2=globalAddressbookList.getContactByUID(ui.draggable.attr('data-id'));
					tmp2.addToContactGroupUID='';
					tmp2.removeToContactGroupUID=new Array();
					tmp2.addToContactGroupUID=$(this).attr('data-id');
					tmp2.uiObjects={contact: ui.draggable, resource: $(this).attr('data-id')};

					lockAndPerformToCollection(tmp2, globalRefAddContact.attr('data-filter-url'), 'ADD_TO_GROUP');
				}
			});

		// if no new makeActive but forceReload is true then reload the current contact group
		if(makeActive==null && forceReload==true)
			makeActive=globalRefAddContact.attr('data-filter-url');

		// load the contact group if it was selected
		if(makeActive!=null)
		{
			$('#ResourceCardDAVList').find('.resourceCardDAV_item').find('.resourceCardDAV_selected').removeClass('resourceCardDAV_selected');
			$('#ResourceCardDAVList').find('[data-id='+jqueryEscapeSelector(makeActive.replace(RegExp('[^/]*$',''),''))+']').addClass('resourceCardDAV_selected');
			$('#ResourceCardDAVList').find('[data-id='+jqueryEscapeSelector(makeActive)+']').addClass('resourceCardDAV_selected');
		}
		if(makeChecked!=null)
		{
			$('#ResourceCardDAVList').find('[data-id='+jqueryEscapeSelector(makeChecked)+']').find('input[type=checkbox]').prop('checked',true);
			this.applyABFilter(dataGetChecked('#ResourceCardDAVList'), false);
		}
	}

	this.removeContactGroup=function(inputUid, loadNext)
	{
		for(var i=this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')].length-1;i>=0;i--)
			if(this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')][i].uid==inputUid)
			{
				var uidRemoved=this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')][i].uid;
				var item=$('#ResourceCardDAVList').find('[data-id^="'+jqueryEscapeSelector(this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')][i].uid)+'"]');

				// remove the item
				item.remove();
				this.vcard_groups[inputUid.replace(RegExp('/[^/]*$',''),'/')].splice(i,1);

// vcardGroupLoaded bolo zrusene, pozriet co s tym
				if(loadNext && this.vcardGroupLoaded!=null && this.vcardGroupLoaded.uid==inputUid)
				{
					this.vcardGroupLoaded=null;

					// set the whole collection as active
					var tmp=uidRemoved.match(RegExp('(^.*/)'),'');
// XXX it is no longer needed
//					globalResourceCardDAVList.loadAddressbookByUID(tmp[1]);
				}
				break;
			}
	}

	// hide/show contacts in the interface according to contactGroupOrResourceUid or search filter in the interface (contactGroupOrResourceUid==false)
	this.applyABFilter=function(contactGroupOrResourceUid, inputForceLoadNext)
	{
		if(globalCardDAVInitLoad)
			return false;

// XXX docasne, potom dame prec
		if(!(contactGroupOrResourceUid instanceof Array))
			return false;

		var vcardGroupOrCollection=[];
		for(var i=0;i<contactGroupOrResourceUid.length;i++)
		{
			if(contactGroupOrResourceUid[i][contactGroupOrResourceUid[i].length-1]=='/')
				vcardGroupOrCollection.push({uid: contactGroupOrResourceUid[i]});
			else		// remember the loaded contact group
			{
				// required only if we want so support collection unloading

				for(var j=0;j<this.vcard_groups[contactGroupOrResourceUid[i].replace(RegExp('/[^/]*$',''),'/')].length;j++)
					if(this.vcard_groups[contactGroupOrResourceUid[i].replace(RegExp('/[^/]*$',''),'/')][j].uid==contactGroupOrResourceUid[i])
					{
// vcardGroupLoaded bolo zrusene, pozriet co s tym
//						vcardGroupOrCollection=this.vcardGroupLoaded=this.vcard_groups[contactGroupOrResourceUid.replace(RegExp('/[^/]*$',''),'/')][j];
						vcardGroupOrCollection.push(this.vcard_groups[contactGroupOrResourceUid[i].replace(RegExp('/[^/]*$',''),'/')][j]);
					}
			}
		}

		var previousActiveIndex=null;	// used to find the nearest contact and set it as selected

		if(this.contactLoaded!=null)
			var previousActiveUID=this.contactLoaded.uid;

		// set all contacts as inactive
		for(var i=0;i<this.contacts.length;i++)
			if(this.contacts[i].headerOnly==undefined)
			{
				if(this.contacts[i].uid==previousActiveUID)
					previousActiveIndex=i;

				this.contacts_hash[this.contacts[i].uid].show=false
				this.contacts[i].show=false;	// XXX zmenit s5 na false
			}

		for(var i=0;i<vcardGroupOrCollection.length;i++)
		{
			if((vcard=vcardGroupOrCollection[i].vcard)==undefined)	// collection
			{
				for(var j=0;j<this.contacts.length;j++)
					if(this.contacts[j].headerOnly==undefined)
					{
							if(this.contacts[j].uid.indexOf(vcardGroupOrCollection[i].uid)==0 && this.contacts[j].search_hide==false)
							{
								this.contacts[j].show=true;
								this.contacts_hash[this.contacts[j].uid].show=true
							}
					}
			}
			else	// vcard group
			{
				var vcardUIDList=new Array();
				// get the members of the array group
				while((vcard_element=vcard.match(vCard.pre['X-ADDRESSBOOKSERVER-MEMBER']))!=null)
				{
					// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
					parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
					vcardUIDList[vcardUIDList.length]=parsed[4].replace('urn:uuid:','');
					// remove the processed parameter
					vcard=vcard.replace(vcard_element[0],'\r\n');
				}

				// update the contacts' "show" attribute
				for(var j=0;j<vcardUIDList.length;j++)
					for(var k=0;k<this.contacts.length;k++)
						if(this.contacts[k].headerOnly==undefined)
						{
							vcard_element=this.contacts[k].vcard.match(vCard.pre['contentline_UID']);

							if(vcard_element!=null)	// only for contacts with UID (non-RFC contacts not contains UID)
							{
								// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
								parsed=vcard_element[0].match(vCard.pre['contentline_parse']);

								if(vcardUIDList[j]==parsed[4] && this.contacts[k].search_hide==false)
								{
									this.contacts[k].show=true;
									this.contacts_hash[this.contacts[k].uid].show=true
								}
							}
						}
			}
		}

		var lastActive=null;
		var prevHeader=null;
		var lastContactForHeader=this.contacts.length-1;
		// performance
		var tmpListRefChildren=globalRefABList.children();
		// the show attribute is now set, we can make changes in the interface
		for(var i=this.contacts.length-1;i>=0;i--)
		{
			if(this.contacts[i].headerOnly==undefined)
			{
				// find the previous header index
				for(var j=i-1;j>=0;j--)
					if(this.contacts[j].headerOnly!=undefined && this.contacts[j].headerOnly==true)
					{
						prevHeader=j;
						break;
					}

				// performance
				var tmpListRefChildren_i_plus_one=tmpListRefChildren.eq(i+1);
				var tmpListRefChildren_prev_plus_one=tmpListRefChildren.eq(prevHeader+1);

				var coll_tmp=this.contacts[i].uid.match(RegExp('^(https?://)([^@/]+(?:@[^@/]+)?)@([^/]+)(.*/)([^/]+/)([^/]*)','i'));
				var collection_uid=coll_tmp[1]+coll_tmp[2]+'@'+coll_tmp[3]+coll_tmp[4]+coll_tmp[5];
				var coll_color=globalResourceCardDAVList.getCollectionByUID(collection_uid).color;
				this.contacts[i].color = coll_color;
				tmpListRefChildren_i_plus_one.find('.ablist_item_color').css('background-color', coll_color);
				switch(this.contacts[i].show)
				{
					case false:
						tmpListRefChildren_i_plus_one.css('display','none');
						if(tmpListRefChildren_i_plus_one.hasClass('ablist_item_selected'))
							lastActive=i;

						var hideHeader=true;
						for(j=prevHeader+1;j<=lastContactForHeader;j++)
							if(this.contacts[j].show==true)
							{
								hideHeader=false;
								break;
							}

						if(hideHeader)
							tmpListRefChildren_prev_plus_one.css('display','none');

						break;
					case true:
						// set the contact header to visible
						tmpListRefChildren_prev_plus_one.css('display','');

						// set the contact to visible
						tmpListRefChildren_i_plus_one.css('display','');
						break;
					default:
						break;
				}
			}
			else
				lastContactForHeader=i-1;
		}

		// the previously loaded contact is hidden or not exists we need to select a new one
		if(inputForceLoadNext==true || $('#vCardEditor').attr('data-editor-state')!='edit' && (lastActive!=null || globalRefABList.children('.ablist_item_selected').length==0))
		{
			var nextCandidateToLoad=null;
			// get the nearest candidate to load
			//  if we can go forward
			if(this.contactToReload!=null)
				nextCandidateToLoad=this.contactToReload;
			else
			{
				for(j=(previousActiveIndex==null ? 0 : previousActiveIndex);j<this.contacts.length;j++)
					if((this.contacts[j].headerOnly==undefined || this.contacts[j].headerOnly==false) && (this.contacts[j].show==true))
					{
						nextCandidateToLoad=this.contacts[j];
						break;
					}
				//  we must go backwards
				if(nextCandidateToLoad==null && previousActiveIndex!=null)
				{
					for(j=previousActiveIndex-1;j>=0;j--)
						if((this.contacts[j].headerOnly==undefined || this.contacts[j].headerOnly==false) && (this.contacts[j].show==true))
						{
							nextCandidateToLoad=this.contacts[j];
							break;
						}
				}
			}
			// make the contact active
			globalRefABList.children('.ablist_item.ablist_item_selected').removeClass('ablist_item_selected');
			if(nextCandidateToLoad!=null)
			{
				// prevent re-loading the contact if it is already loaded
				if((this.contactToReload!=null||$('#vCardEditor').attr('data-url')!=nextCandidateToLoad.uid) && !globalCardDAVInitLoad)
				{
					this.loadContactByUID(nextCandidateToLoad.uid);
				}
				else	// because the collection click unselects the active contact we need to re-select it
				{
					// Make the selected contact active
					globalRefABList.children('.ablist_item.ablist_item_selected').removeClass('ablist_item_selected');
					globalRefABList.children('[data-id='+jqueryEscapeSelector(nextCandidateToLoad.uid)+']').addClass('ablist_item_selected');
				}
				// move scrollbar to ensure that the contact is visible in the interface
				if((selected_contact=globalRefABList.children('.ablist_item_selected')).length==1)
					globalRefABList.scrollTop(globalRefABList.scrollTop()+selected_contact.offset().top-globalRefABList.offset().top-globalRefABList.height()*globalKBNavigationPaddingRate);
			}
			else
			{
				this.contactLoaded=null;
				$('#ABContactColor').css('background-color', '');
				$('#ABContact').html('');
			}
		}
		if(this.contactToReload!=null&& (selected_contact=globalRefABList.find('[data-id="'+this.contactToReload.uid+'"]')).length==1)
		{
			selected_contact.addClass('ablist_item_selected');
			globalRefABList.scrollTop(globalRefABList.scrollTop()+selected_contact.offset().top-globalRefABList.offset().top-globalRefABList.height()*globalKBNavigationPaddingRate);
		
		}
	}

	this.getABCategories=function(returnSorted)
	{
		var categoriesArr=[];

		for(var category in this.contact_categories)
			categoriesArr.push(category);

		if(returnSorted)
			return categoriesArr.sort(function(x,y){return x.customCompare(y,globalSortAlphabet,1,false)});
		else
			return categoriesArr;
	}

	this.getABCompanies=function(returnSorted)
	{
		var companiesArr=[];

		for(var company in this.contact_companies)
			companiesArr.push(company);

		if(returnSorted)
			return companiesArr.sort(function(x,y){return x.customCompare(y,globalSortAlphabet,1,false)});
		else
			return companiesArr;
	}

	this.getABCompanyDepartments=function(inputCompany)
	{
		var departmentsArr=[];

		if(this.contact_companies[inputCompany]!=undefined)
			departmentsArr=this.contact_companies[inputCompany].departments.slice();

		return departmentsArr.sort(function(x,y){return x.customCompare(y,globalSortAlphabet,1,false)});
	}

	// Contact list is not sorted, instead "insert sort" is performed
	this.insertContact=function(inputContact, forceReload, disableDOM)
	{
		// Apple "group" vCards
		if(this.isContactGroup(inputContact.vcard))
			return this.insertContactGroup(inputContact, forceReload, false);

		// check for company contact
		inputContact.isCompany=false;
		var vcard_element=inputContact.vcard.match(vCard.pre['X-ABShowAs']);
		if(vcard_element!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			if(vcardUnescapeValue(parsed[4]).match(RegExp('^company$','i')))
				inputContact.isCompany=true;
		}

		// check for company contact
		if((typeof globalContactsExtVcardToData)=='function')
		{
			inputContact.isLegacy=false;
			var vcard_element=inputContact.vcard.match(RegExp('\r\nX-IsLegacy:.*\r\n', 'mi'));
			if(vcard_element!=null)
			{
				// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
				var parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
				if(vcardUnescapeValue(parsed[4]).match(RegExp('^(?:yes|1|true)$', 'i')))
					inputContact.isLegacy=true;
			}
		}
		if((inputContact.sortkey=this.getSortKey(inputContact, globalSettings.collectionsort.value, 0))===false || (inputContact.displayvalue=this.getSortKey(inputContact, globalSettings.collectiondisplay.value, 1))===false)
			return false;	//invalid vcard

		// contact UID attr
		var vcard_element=inputContact.vcard.match(vCard.pre['contentline_UID']);
		if(vcard_element!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			inputContact.uidattr=vcardUnescapeValue(parsed[4]);
		}
		else	// UID attr is REQUIRED
			return false;	// invalud vcard

		var tmpTemplateRef=globalRefABListTemplate;
		var tmpAddRef=globalRefAddContact;
		var this_destination=this.contacts;
		var this_destination_hash=this.contacts_hash;
		var this_destination_hash_uidattr=this.contacts_hash_uidattr;

		// search plugin requirement
		inputContact.search_hide=false;

		// CATEGORIES suggestion
		var categoriesArr=(inputContact.categories=='' ? [] : vcardSplitValue(inputContact.categories,','));
		var allCategoriesArr=this.getABCategories(false);

		// The search funcionality uses this ASCII value (you can add additional data here)
		// ORG attribute
		var tmp=inputContact.vcard;
		var orgArr=[];
		var depArr=[];
		var tmpCurrentCompany='';
		var tmpCurrentDepartment='';
		while((vcard_element=tmp.match(vCard.pre['contentline_ORG']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			var parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			var parsed_valArr=vcardSplitValue(parsed[4], ';');

			tmpCurrentCompany=(parsed_valArr[0]==undefined || parsed_valArr[0]=='' ? '' : parsed_valArr[0]);
			tmpCurrentDepartment=(parsed_valArr[1]==undefined || parsed_valArr[1]=='' ? '' : parsed_valArr[1]);

			if(tmpCurrentCompany!='')
				orgArr[orgArr.length]=vcardUnescapeValue(tmpCurrentCompany);

			if(tmpCurrentDepartment)
				depArr[depArr.length]=vcardUnescapeValue(tmpCurrentDepartment);

			// remove the processed parameter
			tmp=tmp.replace(vcard_element[0],'\r\n');
		}
		var allOrgArr=this.getABCompanies(false);

		// N attribute
		var nArr=[];
		while((vcard_element=tmp.match(vCard.pre['contentline_N']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			var parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			var parsed_valArr=vcardSplitValue(parsed[4],';');

			for(var i=0;i<parsed_valArr.length;i++)
				if(parsed_valArr[i]!=undefined && parsed_valArr[i]!='')
					nArr[i]=(nArr[i]==undefined ? '' : nArr[i]+' ')+vcardUnescapeValue(parsed_valArr[i]);

			// remove the processed parameter
			tmp=tmp.replace(vcard_element[0],'\r\n');
		}

		// NICKNAME attribute
		var nicknameArr=[];
		while((vcard_element=tmp.match(vCard.pre['contentline_NICKNAME']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);

			nicknameArr[nicknameArr.length]=parsed[4];

			// remove the processed parameter
			tmp=tmp.replace(vcard_element[0],'\r\n');
		}

		// TEL attribute
		var telArr=[];
		while((vcard_element=tmp.match(vCard.pre['contentline_TEL']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);

			telArr[telArr.length]=(parsed[4].charAt(0)=='+' ? '+' : '')+parsed[4].replace(RegExp('[^0-9]','g'),'');

			// remove the processed parameter
			tmp=tmp.replace(vcard_element[0],'\r\n');
		}

		// EMAIL attribute
		var emailArr=[];
		while((vcard_element=tmp.match(vCard.pre['contentline_EMAIL']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			parsed=vcard_element[0].match(vCard.pre['contentline_parse']);

			emailArr[emailArr.length]=parsed[4];

			// remove the processed parameter
			tmp=tmp.replace(vcard_element[0],'\r\n');
		}

		// ADR attribute
		var adrArr=[];
		while((vcard_element=tmp.match(vCard.pre['contentline_ADR']))!=null)
		{
			// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
			var parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
			var parsed_valArr=vcardSplitValue(parsed[4],';');
			//city
			if(parsed_valArr[3]!=undefined && parsed_valArr[3]!='')
				adrArr[3]=vcardUnescapeValue(parsed_valArr[3]);
			//zip code
			if(parsed_valArr[5]!=undefined && parsed_valArr[5]!='')
				adrArr[5]=vcardUnescapeValue(parsed_valArr[5]);
			// remove the processed parameter
			tmp=tmp.replace(vcard_element[0],'\r\n');
		}

		// Search data (displayvalue+categories+orgs+deps+emails)
		inputContact.searchvalue=(nArr.join(' ')+' '+nicknameArr.join(' ')+' '+categoriesArr.join(' ')+' '+orgArr.join(' ')+' '+depArr.join(' ')+' '+telArr.join(' ')+' '+emailArr.join(' ')+' '+adrArr.join(' ')).multiReplace(globalSearchTransformAlphabet);

		// CATEGORIES suggestion
		for(var i=0;i<allCategoriesArr.length;i++)	// if a contact is changed remove it from previous categories
			if(categoriesArr.indexOf(allCategoriesArr[i])==-1)
			{
				var index=this.contact_categories[allCategoriesArr[i]].indexOf(inputContact.uid);
				if(index!=-1)
				{
					this.contact_categories[allCategoriesArr[i]].splice(index,1);

					if(this.contact_categories[allCategoriesArr[i]].length==0)
						delete this.contact_categories[allCategoriesArr[i]];
				}
			}
		for(var i=0;i<categoriesArr.length;i++)	// add contact to it's categories
			this.contact_categories[categoriesArr[i]]=(this.contact_categories[categoriesArr[i]]==undefined ? [] : this.contact_categories[categoriesArr[i]]).concat(inputContact.uid).sort().unique();

		// ORG suggestion
		for(var i=0;i<allOrgArr.length;i++)	// if a contact is changed remove it from previous companies
			if(orgArr.indexOf(allOrgArr[i])==-1)
			{
				var index=this.contact_companies[allOrgArr[i]].uids.indexOf(inputContact.uid);
				if(index!=-1)
				{
					this.contact_companies[allOrgArr[i]].uids.splice(index,1);

					if(this.contact_companies[allOrgArr[i]].uids.length==0)
						delete this.contact_companies[allOrgArr[i]];
				}
			}

		for(var i=0;i<orgArr.length;i++)	// add contact to it's companies
			this.contact_companies[orgArr[i]]={uids: (this.contact_companies[orgArr[i]]==undefined ? [] : this.contact_companies[orgArr[i]].uids).concat(inputContact.uid).sort().unique(), departments: (this.contact_companies[orgArr[i]]==undefined ? [] : this.contact_companies[orgArr[i]].departments).concat(depArr).sort().unique()};

		var makeActive=null;

		// do not insert entry with duplicate UID
		if(this_destination_hash[inputContact.uid]!=undefined)
		{
			var beforeSortKeyChar='';
			if(typeof globalGroupContactsByCompanies!='undefined' && globalGroupContactsByCompanies==true && tmpCurrentCompany=='' && tmpCurrentDepartment=='')
				beforeSortKeyChar='\u0009';
			if(this_destination_hash[inputContact.uid].displayvalue==inputContact.displayvalue && this_destination_hash[inputContact.uid].sortkey==(beforeSortKeyChar+inputContact.sortkey) && this_destination_hash[inputContact.uid].isCompany==inputContact.isCompany && this_destination_hash[inputContact.uid].isLegacy==inputContact.isLegacy)
			{
				// we perform the normalization here, because we need to check whether the vCard is changed or not
				//  normalize the vCard when it's loaded first time
				if(inputContact.normalized==false)
				{
					inputContact.normalized=true;
					inputContact.vcard=normalizeVcard(additionalRFCFixes(inputContact.vcard));
				}
				this_destination_hash[inputContact.uid]=inputContact;
				this_destination_hash_uidattr[inputContact.uidattr]=inputContact;	// hash by UID attr

				// if the contact is loaded and the editor is in 'show' state, reload it
				if(this.contactLoaded!=null && this.contactLoaded.uid==inputContact.uid && this.contactLoaded.vcard!=inputContact.vcard && $('#vCardEditor').attr('data-editor-state')=='show')
				{
					this.loadContactByUID(inputContact.uid);
					show_editor_message('in', 'message_success', localization[globalInterfaceLanguage].contactConcurrentChange,globalHideInfoMessageAfter);
					return 0;
				}
				else	// we are editing the contact or it is not active
					return -1;
			}
			else
			{
				if(this.contactLoaded!=null && this.contactLoaded.uid==inputContact.uid && forceReload==true)
						makeActive=inputContact.uid;
				if($('#vCardEditor').attr('data-url')==inputContact.uid)
					this.contactToReload=this.contactLoaded;
				else
					this.contactToReload=null;
				// the contact name is changed and must be moved to correct place (we first remove it and then reinsert)
				this.removeContact(inputContact.uid,false);
			}
		}

		if(typeof globalGroupContactsByCompanies!='undefined' && globalGroupContactsByCompanies==true)
		{
			if(tmpCurrentCompany=='' && tmpCurrentDepartment=='')
			{
				headerValue=headerSortKey='\u0009';
				inputContact.sortkey='\u0009'+inputContact.sortkey;
			}
			else
			{
				headerValue=vcardUnescapeValue(tmpCurrentCompany)+(tmpCurrentDepartment=='' ? '' : ' ['+vcardUnescapeValue(tmpCurrentDepartment)+']');
				if(typeof (getCRMSortKey)== 'function')
					headerSortKey=getCRMSortKey(inputContact);
				else
					headerSortKey=tmpCurrentCompany+'\u0009'+tmpCurrentDepartment+'\u0009';
			}
		}
		else
		{
			var headerValue='';
			// key value for most common non-alphabet characters is defined as '#'
			if(inputContact.sortkey[0]!=undefined)
			{
				var unicodeValue=inputContact.sortkey.charCodeAt(0);
				if(unicodeValue<65 || (unicodeValue>90 && unicodeValue<97) || (unicodeValue>122 && unicodeValue<127))
				{
					headerValue='#';
					inputContact.sortkey='#'+inputContact.sortkey;
				}
				else
					headerValue=inputContact.sortkey.charAt(0).toUpperCase();
			}
			else
			{
				headerValue='#';
				inputContact.sortkey='#';
			}

			headerSortKey=headerValue;
		}

		// create the header
		var headerObject={headerOnly: true, sortkey: headerSortKey, displayvalue: headerValue};

		// find the index where to insert the new contact O(n*log(n))
		insertIndex=0;
		low=0;
		high=this_destination.length-1;
		if(this_destination.length>0)
			while(low<high)
			{
				insertIndex=low+Math.round((high-low)/2);
				result=(cmp_str=this_destination[insertIndex].sortkey).customCompare(inputContact.sortkey,globalSortAlphabet, 1, false);

				if(result==-1)
				{
					if(insertIndex+1==this_destination.length-1 && typeof this_destination[insertIndex+1]!='undefined' && (cmp_str=this_destination[insertIndex+1].sortkey).customCompare(inputContact.sortkey, globalSortAlphabet, 1, false)==-1)
					{
						insertIndex+=2;
						break;
					}
					else
						low=++insertIndex;
				}
				else if(result==1)
				{
					if((cmp_str=this_destination[insertIndex-1].sortkey).customCompare(inputContact.sortkey, globalSortAlphabet, 1, false)==-1)
						break;
					else
						high=--insertIndex;
				}
			}

		// check for header existence
		var headerMiss=1;
		for(var i=0;i<this_destination.length;i++)
			if(this_destination[i].headerOnly!=undefined && this_destination[i].headerOnly==true && this_destination[i].displayvalue==headerObject.displayvalue)
				{headerMiss=0; break;}

		// insert the header if not exists
		if(headerMiss)
			this_destination.splice(insertIndex,0,headerObject);
		// insert the contact
		this_destination.splice(insertIndex+headerMiss,0,inputContact);
		// insert reference to the contact into hash for much faster search by UID and UID attr
		this_destination_hash[inputContact.uid]=this_destination[insertIndex+headerMiss];
		this_destination_hash_uidattr[inputContact.uidattr]=this_destination[insertIndex+headerMiss];

		// DOM processing can be disabled for performance (then we use mass DOM operations)
		if(!disableDOM)
		{
			// insert header to interface if not exists
			if(headerMiss)
			{
				var newElement=globalTranslABListHeader.clone();
				newElement.text(headerObject.displayvalue);
				globalRefABList.children().eq(insertIndex).after(newElement);
			}

			// insert the contact to interface
			var newElement=globalTranslABListItem.clone();
			if(typeof inputContact.isLegacy!='undefined' && inputContact.isLegacy)
				newElement.css('text-decoration','line-through');
			else
				newElement.css('text-decoration','none');

			newElement.attr('data-id', inputContact.uid);
			newElement.find('.ablist_item_color').css('background-color', inputContact.color);
			newElement.find('.ablist_item_data').append(vcardUnescapeValue(inputContact.displayvalue));
			newElement.click(function(){if($(this).hasClass('ablist_item_selected') || globalObjectLoading) return false; else globalAddressbookList.loadContactByUID(this.getAttribute('data-id'));});
			// set the company icon
			if(inputContact.isCompany==true)
				newElement.addClass('company');

			if(typeof globalDisableDragAndDrop=='undefined' || globalDisableDragAndDrop!=true)
				newElement.draggable({
					delay: 250,
					revert: 'invalid',
					scroll: false,
					opacity: 0.8,
					stack: '#SystemCardDavMATE',
					containment: '#SystemCardDavMATE',
					appendTo: 'body',
					start: function( event, ui ){
						// disallow on read-only collection
						if(globalResourceCardDAVList.getCollectionPrivByUID($(this).attr('data-id').replace(RegExp('[^/]*$'),''))==true)
							return false;
					},
					helper: function(){
						$('#ResourceCardDAVList').find('.resourceCardDAV.ui-droppable').droppable( 'option', 'accept', false);
						$('#ResourceCardDAVList').find('.group.ui-droppable').droppable( 'option', 'accept', false);

						$('#ResourceCardDAVList').find('.resourceCardDAV[data-id!='+jqueryEscapeSelector($(this).attr('data-id').replace(RegExp('[^/]+$'),''))+'].ui-droppable').droppable( 'option', 'accept', '.ablist_item');
						var myContactGroups=globalAddressbookList.getMyContactGroups($(this).attr('data-id'));
						$('#ResourceCardDAVList').find('.group[data-id^='+jqueryEscapeSelector($(this).attr('data-id').replace(RegExp('[^/]+$'),''))+'].ui-droppable').each(function(index, element){
							if(myContactGroups.indexOf($(element).attr('data-id'))==-1)
								$(element).droppable( 'option', 'accept', '.ablist_item');
						});

						var tmp=$(this).clone();
						tmp.addClass('ablist_item_dragged');
						// we cannot use .css() here, because we need to add !important (problem with Gecko based browsers)
						var tmp_style='max-width: '+$(this).outerWidth()+'px;';
						if($(this).css('background-image')!='none')
							tmp_style+='background-image: url(images/company_s_w.svg) !important;';
						tmp.attr('style', tmp_style);

						return tmp;
					}
				});

			globalRefABList.children().eq(insertIndex+headerMiss).after(newElement);
			if($('#vCardEditor').attr('data-editor-state')=='edit')
			{
				if((selected_contact=globalRefABList.children('.ablist_item_selected')).length==1)
					globalRefABList.scrollTop(globalRefABList.scrollTop()+selected_contact.offset().top-globalRefABList.offset().top-globalRefABList.height()*globalKBNavigationPaddingRate);
			}
// toto tu asi nahradit zavolanim trigger('click') co vyrazne sprehladni kod
// =>
			// load the updated contact (because we first deleted it, we need to set it active)
			if(makeActive!=null)
			{
				// make the contact active
				globalRefABList.children('.ablist_item.ablist_item_selected').removeClass('ablist_item_selected');
				globalRefABList.children().eq(insertIndex+headerMiss+1).addClass('ablist_item_selected');
				this.loadContactByUID(makeActive);
			}
		}
	}

	this.renderContacs=function()
	{
		var this_destination=this.contacts;
		var this_destination_hash=this.contacts_hash;

		// do not forget to insert the template
		var tmpResultObject=[globalRefABListTemplate.clone()];

		for(var i=0;i<this_destination.length;i++)
		{
			if(this_destination[i].headerOnly!=undefined && this_destination[i].headerOnly==true)
			{
				var newElement=globalTranslABListHeader.clone();
				newElement.text(this_destination[i].displayvalue);
			}
			else
			{

				// insert the contact to interface
				var newElement=globalTranslABListItem.clone();
				if(typeof this_destination[i].isLegacy!='undefined' && this_destination[i].isLegacy)
					newElement.css('text-decoration','line-through');
				else
					newElement.css('text-decoration','none');
				newElement.attr('data-id', this_destination[i].uid);
				newElement.find('.ablist_item_color').css('background-color', this_destination[i].color);
				newElement.find('.ablist_item_data').append(vcardUnescapeValue(this_destination[i].displayvalue));
				newElement.click(function(){if($(this).hasClass('ablist_item_selected') || globalObjectLoading) return false; else globalAddressbookList.loadContactByUID(this.getAttribute('data-id'));});
				// set the company icon
				if(this_destination[i].isCompany==true)
					newElement.addClass('company');

				if(typeof globalDisableDragAndDrop=='undefined' || globalDisableDragAndDrop!=true)
					newElement.draggable({
						delay: 250,
						revert: 'invalid',
						scroll: false,
						opacity: 0.8,
						stack: '#SystemCardDavMATE',
						containment: '#SystemCardDavMATE',
						appendTo: 'body',
						start: function( event, ui ){
							// disallow on read-only collection
							if(globalResourceCardDAVList.getCollectionPrivByUID($(this).attr('data-id').replace(RegExp('[^/]*$'),''))==true)
								return false;
						},
						helper: function(){
							$('#ResourceCardDAVList').find('.resourceCardDAV.ui-droppable').droppable( 'option', 'accept', false);
							$('#ResourceCardDAVList').find('.group.ui-droppable').droppable( 'option', 'accept', false);

							$('#ResourceCardDAVList').find('.resourceCardDAV[data-id!='+jqueryEscapeSelector($(this).attr('data-id').replace(RegExp('[^/]+$'),''))+'].ui-droppable').droppable( 'option', 'accept', '.ablist_item');
							var myContactGroups=globalAddressbookList.getMyContactGroups($(this).attr('data-id'));
							$('#ResourceCardDAVList').find('.group[data-id^='+jqueryEscapeSelector($(this).attr('data-id').replace(RegExp('[^/]+$'),''))+'].ui-droppable').each(function(index, element){
								if(myContactGroups.indexOf($(element).attr('data-id'))==-1)
									$(element).droppable( 'option', 'accept', '.ablist_item');
							});

							var tmp=$(this).clone();
							tmp.addClass('ablist_item_dragged');
							// we cannot use .css() here, because we need to add !important (problem with Gecko based browsers)
							var tmp_style='max-width: '+$(this).outerWidth()+'px;';
							if($(this).css('background-image')!='none')
								tmp_style+='background-image: url(images/company_s_w.svg) !important;';
							tmp.attr('style', tmp_style);

							return tmp;
						}
					});
			}
			tmpResultObject.push(newElement);
		}
		globalRefABList.empty().append(tmpResultObject);
	}

	this.removeContact=function(inputUid, loadNext, isFromPUT)
	{
		if(!(inputUid instanceof Array))
			inputUid=[inputUid];
		var tmpRex=new RegExp('/[^/]*$','');

		// Apple "group" vCards
		for(var i=inputUid.length-1;i>=0;i--)
			for(var j=this.vcard_groups[inputUid[i].replace(tmpRex,'/')].length-1;j>=0;j--)
				if(inputUid.indexOf(this.vcard_groups[inputUid[i].replace(tmpRex,'/')][j].uid)!=-1)
					return this.removeContactGroup(inputUid[i], loadNext);

		for(var i=this.contacts.length-1;i>=0;i--)
			if(this.contacts[i]!=undefined&&inputUid.indexOf(this.contacts[i].uid)!=-1)
			{
				var inUID=this.contacts[i].uid;
				// CATEGORIES suggestion
				var categoriesArr=vcardSplitValue(this.contacts[i].categories,',');
				for(var j=0;j<categoriesArr.length;j++)
					if(this.contact_categories[categoriesArr[j]]!=undefined)
					{
						var index=this.contact_categories[categoriesArr[j]].indexOf(this.contacts[i].uid);
						if(index!=-1)
						{
							this.contact_categories[categoriesArr[j]].splice(index,1);

							if(this.contact_categories[categoriesArr[j]].length==0)
								delete this.contact_categories[categoriesArr[j]];
						}
					}

				// ORG suggestion
				var tmp=this.contacts[i].vcard;
				var orgArr=[];
				while((vcard_element=tmp.match(vCard.pre['contentline_ORG']))!=null)
				{
					// parsed (contentline_parse) = [1]->"group.", [2]->"name", [3]->";param;param", [4]->"value"
					parsed=vcard_element[0].match(vCard.pre['contentline_parse']);
					orgArr[orgArr.length]=vcardUnescapeValue(vcardSplitValue(parsed[4],';')[0]);

					// remove the processed parameter
					tmp=tmp.replace(vcard_element[0],'\r\n');
				}
				for(var j=0;j<orgArr.length;j++)
					if(this.contact_companies[orgArr[j]]!=undefined /* there is no suggestion for '' company */ && this.contact_companies[orgArr[j]].uids!=undefined)
					{
						var index=this.contact_companies[orgArr[j]].uids.indexOf(this.contacts[i].uid);
						if(index!=-1)
						{
							this.contact_companies[orgArr[j]].uids.splice(index,1);

							if(this.contact_companies[orgArr[j]].uids.length==0)
								delete this.contact_companies[orgArr[j]];
						}
					}

				var nextCandidateToLoad=null;
				var item=globalRefABList.find('[data-id^="'+jqueryEscapeSelector(this.contacts[i].uid)+'"]');

				// get the nearest candidate to load
				//  if we can go forward
				for(j=i+1;j<this.contacts.length;j++)
					if(this.contacts[j].headerOnly!=true && (typeof isFromPUT!='undefined' || this.contacts[j].show==true))
					{
						nextCandidateToLoad=this.contacts[j];
						break;
					}
				//  we must go backwards
				if(nextCandidateToLoad==null)
				{
					for(j=i-1;j>=0;j--)
						if(this.contacts[j].headerOnly!=true && this.contacts[j].show==true)
						{
							nextCandidateToLoad=this.contacts[j];
							break;
						}
				}

				// remove the item
				item.remove();
				this.contacts.splice(i,1);
				if(this.contacts_hash[inUID]!=undefined)
				{
					delete this.contacts_hash_uidattr[this.contacts_hash[inUID].uidattr];
					delete this.contacts_hash[inUID];
				}
				else if(this.companies_hash[inUID]!=undefined)
				{
					delete this.companies_hash_uidattr[this.contacts_hash[inUID].uidattr];
					delete this.companies_hash[inUID];
				}

				// remove the header if there is no more contact
				var removeHeader=true;
				var prevHeader=null;
				// find the previous header index
				for(var j=i-1;j>=0;j--)
					if(this.contacts[j].headerOnly!=undefined && this.contacts[j].headerOnly==true)
					{
						prevHeader=j;
						break;
					}

				// check for contact existence for the found header
				if((prevHeader+1)<this.contacts.length && (this.contacts[prevHeader+1].headerOnly==undefined || this.contacts[prevHeader+1].headerOnly!=true))
					removeHeader=false;

				// remove the header
				if(removeHeader==true)
				{
					globalRefABList.children().eq(prevHeader+1).remove();
					this.contacts.splice(prevHeader,1);
				}

				// hide header if there is no more visible contacts
				var hideHeader=true;
				for(j=prevHeader+1;j<this.contacts.length && (this.contacts[j].headerOnly==undefined || this.contacts[j].headerOnly!=true);j++)
					if(this.contacts[j].show==true)
					{
						hideHeader=false;
						break;
					}

				if(hideHeader)
					globalRefABList.children().eq(prevHeader+1).css('display','none');

				// update the active search
				if(globalQs!=null)
					globalQs.cache();

				// load next contact
				if(loadNext && this.contactLoaded!=null)
				{
					if(nextCandidateToLoad!=null)
						this.loadContactByUID(nextCandidateToLoad.uid);
					else
					{
						this.contactLoaded=null;
						$('#ABContactColor').css('background-color', '');
						$('#ABContact').html('');
					}
				}
			}
	}

	this.checkAndTouchIfExists=function(inputUID,inputEtag,inputTimestamp)
	{
		if(this.contacts_hash[inputUID]!=undefined)
		{
			this.contacts_hash[inputUID].timestamp=inputTimestamp;

			if(this.contacts_hash[inputUID].etag==inputEtag)
				return true;
			else
				return false;
		}
		else
			return false;
	}

	this.removeOldContacts=function(inputUidBase, inputTimestamp)
	{
		for(var i=this.contacts.length-1;i>=0;i--)
			if(this.contacts[i]!=undefined /* because the header can be deleted with the contact */ && this.contacts[i].timestamp!=undefined && this.contacts[i].uid.indexOf(inputUidBase)==0 && this.contacts[i].timestamp<inputTimestamp)
				this.removeContact(this.contacts[i].uid, true);
	}

	this.loadContactByUID=function(inputUID)
	{
		// find the inputUID contact
		if(this.contacts_hash[inputUID]!=undefined)
		{
			globalObjectLoading=true;	// temporary disable keyboard navigation

			// normalize the vCard when it's loaded first time
			if(this.contacts_hash[inputUID].normalized==false)
			{
				this.contacts_hash[inputUID].normalized=true;
				this.contacts_hash[inputUID].vcard=normalizeVcard(additionalRFCFixes(this.contacts_hash[inputUID].vcard));
			}

			var is_readonly=globalResourceCardDAVList.getCollectionPrivByUID(this.contacts_hash[inputUID].uid.replace(RegExp('[^/]*$'),''));
			var loadContact=this.contactLoaded=this.contacts_hash[inputUID];

//			CardDAVeditor_cleanup(false, this.contacts_hash[inputUID].isCompany);	// editor initialization

			if(vcardToData(loadContact, is_readonly, this.contacts_hash[inputUID].isCompany, 'hide', []))
				$('#EditorBox').fadeTo(0, 1, function(){	/* 0 => no animation */
					globalObjectLoading=false;	// re-enable keyboard navigation
				});
			else
			{
				$('#ABContactColor').css('background-color', '');
				$('#ABContact').empty();
				globalDisableAnimationMessageHiding='contactRfcNotCompliant';
				var tmpTime=show_editor_message('out','message_error', localization[globalInterfaceLanguage].contactRfcNotCompliant, globalHideInfoMessageAfter);
				setTimeout(function(){globalObjectLoading=false;}, tmpTime);	// re-enable keyboard navigation
			}
			// Make the selected contact active
			globalRefABList.children('.ablist_item.ablist_item_selected').removeClass('ablist_item_selected');
			globalRefABList.children('[data-id='+jqueryEscapeSelector(this.contacts_hash[inputUID].uid)+']').addClass('ablist_item_selected');
			this.contactToReload=null;
			if(globalRefABList.children('[data-id='+jqueryEscapeSelector(this.contacts_hash[inputUID].uid)+']:visible').length>0&&$('#ABInMessageEditBox').css('display')!='none')
			{
				animate_message('#ABInMessageEditBox', '#ABInMessageTextEditBox', 0, '-=');
				$('#ABInMessageEditBox').css('display','');
				
			}
			else if(globalRefABList.children('[data-id='+jqueryEscapeSelector(this.contacts_hash[inputUID].uid)+']:visible').length==0&&$('#ABInMessageEditBox').css('display')=='none')
			{
				this.contactToReload=this.contacts_hash[inputUID];
				globalDisableAnimationMessageHiding='errContactHidden';
				$('#ABInMessageEditBox').css('display','block');
				$('#ABInMessageTextEditBox').attr('class','message_success');
				$('#ABInMessageTextEditBox').text(localization[globalInterfaceLanguage][globalDisableAnimationMessageHiding]);
				animate_message('#ABInMessageEditBox', '#ABInMessageTextEditBox', globalHideInfoMessageAfter);
			}
			if($('#ResourceCardDAVListOverlay').is(':visible'))
			{
				if($('#ABContactOverlay').is(':visible'))
				{
					var animation = 400;
					var duration = globalHideInfoMessageAfter + 2*animation;
					setTimeout(function(){
						$('#ResourceCardDAVListOverlay').fadeOut(animation);
						$('#ABListOverlay').fadeOut(animation,function(){});
						$('#ABContactOverlay').fadeOut(animation,function(){globalRefAddContact.prop('disabled',false);});
					},duration-animation);
				}
				else
				{
					$('#ResourceCardDAVListOverlay').fadeOut(globalEditorFadeAnimation);
					$('#ABListOverlay').fadeOut(globalEditorFadeAnimation,function(){});
				}
			}
		}
		else
		{
			$('#ABContactColor').css('background-color', '');
			$('#ABContact').empty();
//			CardDAVeditor_cleanup(false, false);	// editor initialization
		}
	}

	this.loadContactByVcard=function(vcard, color, isCompany, inputEditorMode, inputEditorLockedEntries)
	{
// sem callback pre index.html a v pripade ak pridavame usera (nie firmu) pridat do vcard prislusny atribut
		if(typeof(globalContactsExtLoadByVcardBefore)=='function')
			vcard=globalContactsExtLoadByVcardBefore(vcard, isCompany);

		var loadContact=new Object();
		loadContact.vcard=vcard;
		loadContact.isCompany=isCompany;
		loadContact.color=color;

		globalObjectLoading=true;			// temporary disable keyboard navigation
		if(vcardToData(loadContact, false /* XXX check this */, isCompany, inputEditorMode, inputEditorLockedEntries))
			$('#EditorBox').fadeTo(0, 1, function(){	/* 0 => no animation */
				// append the UID of previous contact into "data-id" for "cancel" functionality
				$('#vCardEditor').find('[data-type="cancel"]').attr('data-id', globalAddressbookList.getLoadedContactUID());
				this.contactLoaded=null;	// do not do this earlier
				globalObjectLoading=false;	// re-enable keyboard navigation
			});
		else
		{
			// todo: replace with icon or text in the editor div
			globalDisableAnimationMessageHiding='contactRfcNotCompliant';
			show_editor_message('out', 'message_error', localization[globalInterfaceLanguage].contactRfcNotCompliant, globalHideInfoMessageAfter);
			this.contactLoaded=null;	// do not do this earlier
			globalObjectLoading=false;	// re-enable keyboard navigation
		}
	}

	// DONE
	this.getContactByUID=function(inputUID)
	{
		// find the inputUID contact
		if(this.contacts_hash[inputUID]!=undefined)
			return this.contacts_hash[inputUID];
		else
			return null;
	}

	// DONE
	this.getContactGroupByUID=function(inputUID)
	{
		var collectionUID=inputUID.replace(RegExp('[^/]*$'),'');
		for(var i=0;i<this.vcard_groups[collectionUID].length;i++)
		{
			if(this.vcard_groups[collectionUID][i].uid==inputUID)
				return this.vcard_groups[collectionUID][i];
		}
		return null;
	}
}
