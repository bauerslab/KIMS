/* jshint browser: true, esversion: 5, asi: true */
/*globals Vue, uibuilder */
// @ts-nocheck
/*
  Copyright (c) 2019 Julian Knight (Totally Information)

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
'use strict'

/** @see https://github.com/TotallyInformation/node-red-contrib-uibuilder/wiki/Front-End-Library---available-properties-and-methods */

var enteringUPC = false;
var upc = "";

// eslint-disable-next-line no-unused-vars
var app1 = new Vue({
    el: '#app',
    data: {
		items:[],
		selected: null,
		scanMode: "Select",
		currentItem: {
			name:"",
			upc:"",
			have:0,
			want:0
		},
    }, // --- End of data --- //

    // Available hooks: init,mounted,updated,destroyed
    mounted: function(){
        //console.debug('[indexjs:Vue.mounted] app mounted - setting up uibuilder watchers')

        /** **REQUIRED** Start uibuilder comms with Node-RED @since v2.0.0-dev3
         * Pass the namespace and ioPath variables if hosting page is not in the instance root folder
         * e.g. If you get continual `uibuilderfe:ioSetup: SOCKET CONNECT ERROR` error messages.
         * e.g. uibuilder.start('/nr/uib', '/nr/uibuilder/vendor/socket.io') // change to use your paths/names
         */
        uibuilder.start()

        var vueApp = this

        //#region ---- Trace Received Messages ---- //
        // If msg changes - msg is updated when a standard msg is received from Node-RED over Socket.IO
        // newVal relates to the attribute being listened to.
        uibuilder.onChange('msg', function(newVal){
			
			if (newVal.topic == "Item List")
			{
				vueApp.items = newVal.payload;
				vueApp.selected = vueApp.items[0].upc;
				vueApp.currentItem = vueApp.items[0];
				for(var i = 0; i < vueApp.items.length; i++)
					Vue.set(vueApp.items[i], 'underStock', vueApp.items[i].have < vueApp.items[i].want);
			}
			
			if (newVal.topic == "Update Item")
			{
				var item = vueApp.items.filter(i => i.upc === newVal.payload.upc)[0];
				var itemIndex;
				if (item)
				{
					itemIndex = vueApp.items.indexOf(item);
					vueApp.items[itemIndex].name = newVal.payload.name;
					vueApp.items[itemIndex].have = newVal.payload.have;
					vueApp.items[itemIndex].want = newVal.payload.want;
				}
				else
				{
					itemIndex = vueApp.items.length;
					item = newVal.payload;
					vueApp.items.push(item);
				}
				
				vueApp.selected = newVal.payload.upc;
				Vue.set(vueApp.items[itemIndex], 'underStock', vueApp.items[itemIndex].have < vueApp.items[itemIndex].want);
				vueApp.currentItem = vueApp.items[itemIndex];
			}
			
			if (newVal.topic == "Add New Item")
			{
				newVal.payload.underStock = newVal.payload.have < newVal.payload.want;
				vueApp.items.push(newVal.payload);
				vueApp.selected = newVal.payload.upc;
				vueApp.currentItem = newVal.payload;
			}
			
			if (newVal.topic == "Delete Item")
			{
				var item = vueApp.items.filter(i => i.upc === newVal.payload)[0];
				if (item)
				{
					var itemIndex = vueApp.items.indexOf(item);
					vueApp.items.splice(itemIndex,1);
					vueApp.currentItem = vueApp.items[itemIndex - 1];
					vueApp.selected = vueApp.currentItem.upc;
				}
			}
        })
        // As we receive new messages, we get an updated count as well
        uibuilder.onChange('msgsReceived', function(newVal){
        })

        // If we receive a control message from Node-RED, we can get the new data here - we pass it to a Vue variable
        uibuilder.onChange('ctrlMsg', function(newVal){
        })
        // Updated count of control messages received
        uibuilder.onChange('msgsCtrl', function(newVal){
        })
        //#endregion ---- End of Trace Received Messages ---- //

        //#region ---- Trace Sent Messages ---- //
        // You probably only need these to help you understand the order of processing //
        // If a message is sent back to Node-RED, we can grab a copy here if we want to
        uibuilder.onChange('sentMsg', function(newVal){
        })
        // Updated count of sent messages
        uibuilder.onChange('msgsSent', function(newVal){
        })

        // If we send a control message to Node-RED, we can get a copy of it here
        uibuilder.onChange('sentCtrlMsg', function(newVal){
        })
        // And we can get an updated count
        uibuilder.onChange('msgsSentCtrl', function(newVal){
        })
        //#endregion ---- End of Trace Sent Messages ---- //

        // If Socket.IO connects/disconnects, we get true/false here
        uibuilder.onChange('ioConnected', function(newVal){
        })
        // If Server Time Offset changes
        uibuilder.onChange('serverTimeOffset', function(newVal){
        })
		
		// Send Refresh click after we are done loading to populate the initial data
		uibuilder.send({'topic':'Refresh'});

    } // --- End of mounted hook --- //

}) // --- End of app1 --- //

document.addEventListener('keydown', function(event) {
    if(event.keyCode == 107) {
		event.returnValue = false;
		enteringUPC = true;
		upc = "";
	}
	else if (enteringUPC)
	{
		event.returnValue = false;
		if (event.keyCode == 13)
		{
			uibuilder.send({topic:"ScanUPC", payload:upc});
			enteringUPC = false;
		}
		else
		{
			upc += event.key;
		}
	}
});

function changeSelection(upc) {
	uibuilder.send({'topic':'SelectUPC', 'payload':upc});
}

function incrementHave() {
	uibuilder.send({'topic':'IncrementHave', 'payload':app1.$data.selected});
}
function incrementWant() {
	uibuilder.send({'topic':'IncrementWant', 'payload':app1.$data.selected});
}
function decrementHave() {
	uibuilder.send({'topic':'DecrementHave', 'payload':app1.$data.selected});
}
function decrementWant() {
	uibuilder.send({'topic':'DecrementWant', 'payload':app1.$data.selected});
}

function rename() {
	var newName = prompt("Select new name for item: ".concat(app1.$data.currentItem.name));
	if (newName)
	{
		app1.$data.currentItem.name = newName;
		uibuilder.send({'topic': 'Rename', 'payload':app1.$data.currentItem});
	}
}
function deleteCurrentItem() {
	if(confirm("Are you sure you want to delete the item: ".concat(app1.$data.currentItem.name)))
		uibuilder.send({'topic': 'Delete', 'payload':app1.$data.currentItem.upc});
}
// EOF