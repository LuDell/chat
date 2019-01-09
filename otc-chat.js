	var ws;//websocket实例
    var lockReconnect = false;//避免重复连接
    var wsServer = socketURI;
    
    //创建WebSocket对象
    function createWebSocket(url) {
    	try {
			if ('WebSocket' in window) {
				ws = new WebSocket(wsServer);
			} else if ('MozWebSocket' in window) {
				ws = new MozWebSocket(wsServer);
			} 
			initEventHandle();
    	 } catch (e) {
             reconnect(url);
         }     
     }
	

     function initEventHandle() {
        ws.onclose = function () {
        	console.log("Socket关闭")
            reconnect(wsServer);
        };
        ws.onerror = function () {
        	console.log("Socket异常")
            reconnect(wsServer);
        };
        ws.onopen = function () {
            //心跳检测重置
            heartCheck.reset().start();
        };
        ws.onmessage = function (event) {
			  analysisMessage(event.data);
            //如果获取到消息，心跳检测重置
            //拿到任何消息都说明当前连接是正常的
            heartCheck.reset().start();
        }
    }

    function reconnect(url) {
        if(lockReconnect) return;
        lockReconnect = true;
        //没连接上会一直重连，设置延迟避免请求过多
        setTimeout(function () {
            createWebSocket(url);
            lockReconnect = false;
        }, 2000);
    }

    
    //心跳检测
    var heartCheck = {
        timeout: 60000,//60秒
        timeoutObj: null,
        serverTimeoutObj: null,
        reset: function(){
            clearTimeout(this.timeoutObj);
            clearTimeout(this.serverTimeoutObj);
            return this;
        },
        start: function(){
            var self = this;
            this.timeoutObj = setTimeout(function(){
                // 这里发送一个心跳，后端收到后，返回一个心跳消息，
                // onmessage 拿到返回的心跳就说明连接正常
                ws.send("{message:HeartBeat}");
                self.serverTimeoutObj = setTimeout(function(){//如果超过一定时间还没重置，说明后端主动断开了
                    ws.close();//如果onclose会执行reconnect，我们执行ws.close()就行了.如果直接执行reconnect 会触发onclose导致重连两次
                }, self.timeout)
            }, this.timeout)
        }
    }

	createWebSocket(wsServer);
  var sends = false;
	function onSend() {
		var message = $(".d-send-box input").val();
		if (sends) {
			return;
		}
		if (message) {
			sendMessage(message);//发送消息
			sends = true;
			$(".sendchatbtn").attr('disabled',true).css({'background-color': '#ccc', 'border': '1px solid #ccc'});
			setTimeout(function(){
				$(".sendchatbtn").attr('disabled',false).css('background-color','#00a1e9');
				sends= false ;
			},5000)
		}
	}

	/**
	 * 发送信息给后台
	 */
	function sendMessage(message) {
		// 消息类型
		var msgType = "message";
		// 客户端向服务端发送消息
		var toUser = "";
		if (chatUser.fromId == chatUser.buyerId ) {
			toUser = chatUser.sellerId
		} else {
			toUser = chatUser.buyerId
		}
		ws.send(JSON.stringify({
			chatId : chatId,
			message : {
				content : message,
				from : chatUser.fromId,
				to : toUser, // 接收人,如果没有则置空,如果有多个接收人则用,分隔
				orderId : orderId,
				time : getDateFull()
			},
			type : msgType
		}));
	}

	/**
	 * 解析后台传来的消息，具体格式如下：
	 * "massage" : {
	 *              "from" : "xxx",
	 *              "to" : "xxx",
	 *              "content" : "xxx",
	 *              "time" : "xxxx.xx.xx",
	 *				"ip":"192.168.1.122"
	 *          },
	 * "type" : {notice|message},
	 * "list" : {[xx],[xx],[xx]}
	 */
	var chatId = "";
	function analysisMessage(message) {
		//解析消息
		message = JSON.parse(message);
		
		//被回复的消息的Id
		chatId = message.chatId;
		
		//会话消息
		if (message.type == "message") {
			showChat(message.message);
		}

	}
	
	/**
	 * 第一次加载拉取数据库近100条聊天数据
	 * 
	 */
	loadMessage();
	function loadMessage() {
		var toUser = "";
		var userImgLink = null
		var otherImgLink = null
		if (chatUser.fromId == chatUser.buyerId ){
			toUser = chatUser.sellerId
			userImgLink = chatUser.buyerImg
			otherImgLink = chatUser.sellerImg
		} else {
			toUser = chatUser.buyerId
			userImgLink = chatUser.sellerImg
			otherImgLink = chatUser.buyerImg
		}
		$.ajax({
			url: baseUrl + '/chatMsg/message.html',
			type: 'post',
			dataType: 'json',
			data: {
        "orderId": orderId,
        "fromId": chatUser.fromId,
        "toId": toUser
      },
			success:function(data){
				var userId = chatUser.fromId;
				var userHref = null
				if (localID === userId) {
					userHref = baseUrl + '/user-center.html?userid='
				} else {
					userHref = baseUrl + '/vistor-center.html?userid='
				}
				// if (data.length == 0 && chatUser.autoReply) {
				// 	var beforeChatPath = null
				// 	var beforeChatImgLink = null
				// 	if (userId = chatUser.sellerId && location.pathname.split('/')[location.pathname.split('/').length-1] == 'sell_order.html') {
				// 		beforeChatPath = 'message-pull'
				// 		beforeChatImgLink = chatUser.sellerImg ? chatUser.sellerImg : (baseUrl + '/res/img/head.png')
				// 	} 
				// 	if (userId = chatUser.buyerId && location.pathname.split('/')[location.pathname.split('/').length-1] == 'buy_order.html') {
				// 		beforeChatPath = 'message-get'
				// 		beforeChatImgLink = chatUser.sellerImg ? chatUser.sellerImg : (baseUrl + '/res/img/head.png')
				// 	}
				// 	// beforeChatImgLink = userImgLink ? userImgLink : (baseUrl + '/res/img/head.png')
				// 	var beforeChatHtml = '<div class="' + beforeChatPath + '">' +
				// 								'<span class="content">' + 
				// 									'<p>' + chatUser.autoReply + '</p>' +
				// 									'<p class="time">now</p>' +
				// 								'</span>' +
				// 								'<span class="username">' + 
				// 									'<div class="d-infoimg">' + 
				// 										'<span class="o-headerA"><a href="' + otherImgLink + userId + '"><img src=" ' + beforeChatImgLink + ' "></a></span>' +
				// 									'</div>' +
				// 								'</span>'+
				// 							'</div>';
				// 	$(".d-chat-window").append(beforeChatHtml);
				// 	$(".d-send-box input").val("");
				// }
				var chatMsg  = data.data;
				$.each(chatMsg,function(index,value){
					var fromId = value.fromId;
					var toId = value.toId;
					var isSef = userId == fromId ? "message-pull" : "message-get"; // 如果是自己则显示在右边,他人信息显示在左边
					var isMyselef = userId == fromId ? "我" : fromId;
					var imgLink = null
					if (userId == fromId) {
						imgLink = userImgLink
						if (!imgLink) {
							imgLink = baseUrl + '/res/img/head.png'
						}
					} else {
						imgLink = otherImgLink
						if (!imgLink) {
							imgLink = baseUrl + '/res/img/head.png'
						}
					}
					var html =  '<div class="' + isSef + '">' +
									      '<span class="content">' + 
									      	'<p>' + value.content + '</p>' +
									      	'<p class="time">' + value.ctime + '</p>' +
									      '</span>' +
									      '<span class="username">' + 
									      	'<div class="d-infoimg">' + 
									      		'<span class="o-headerA"><a href="' + userHref + userId + '"><img src=" ' + imgLink + ' "></a></span>' +
									      	'</div>' +
									      '</span>'+
						          '</div>';
					$(".d-chat-window").append(html);
					$(".d-send-box input").val(""); //清空输入区
				})
				$(".d-chatbox").scrollTop($(".d-chatbox")[0].scrollHeight);
			},
			error: function (e) {
				console.log(e)
			}
		});
	}
	
	/**
	 * 展示会话信息
	 */
	function showChat(message) {
		//alert("接受到数据：" + message.content);
		//css控制聊天显示的位置 
		//当前登陆的（我的）用户ID
		var userImgLink = null
		var otherImgLink = null
		if (chatUser.fromId != chatUser.buyerId ){
			userImgLink = chatUser.sellerImg
			otherImgLink = chatUser.buyerImg
		} else {
			userImgLink = chatUser.buyerImg
			otherImgLink = chatUser.sellerImg
		}
		var userId = chatUser.fromId;
		var isSef = userId == message.from ? "message-pull" : "message-get"; //如果是自己则显示在右边,他人信息显示在左边
		var isMyselef = userId == message.from ? "我" : message.from;
		var imgLink = null
		if (userId == message.from) {
			imgLink = userImgLink
			if (!imgLink) {
				imgLink = baseUrl + '/res/img/head.png'
			}
		} else {
			imgLink = otherImgLink
			if (!imgLink) {
				imgLink = baseUrl + '/res/img/head.png'
			}
		}
		var html =  '<div class="' + isSef + '">' +
						      '<span class="content">' + 
						      	'<p>' + message.content + '</p>' +
						      	'<p class="time">' + message.time + '</p>' +
						      '</span>' +
						      '<span class="username">' + 
						      	'<div class="d-infoimg">' + 
						      		'<span class="o-headerA"><img src="' + imgLink + '"></span>' +
						      	'</div>' +
						      '</span>'+
			          '</div>';
		$(".d-chat-window").append(html);
		$(".d-send-box input").val(""); //清空输入区
		$(".d-chatbox").scrollTop($(".d-chatbox")[0].scrollHeight);
	}

	function appendZero(s) {
		return ("00" + s).substr((s + "").length);
	} //补0函数

	// 日期格式化函数
	function getDateFull() {
		var date = new Date();
		var currentdate = date.getFullYear()+ "-"
				+ appendZero(date.getMonth()+ 1) + "-"
				+ appendZero(date.getDate()) + " "
				+ appendZero(date.getHours()) + ":"
				+ appendZero(date.getMinutes()) + ":"
				+ appendZero(date.getSeconds());
		return currentdate;
	}
