function show(board) {
    var width = board[0].length
    var height = board.length
    var text = ''
    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            switch(board[y][x]) {
            case 1:
                text += '⚫'
                break
            case 2:
                text += '⚪'
                break
            default:
                text += '➕'
            }
        }
        text += "\n"
    }
    $('#debug').text(text)
}


$.ajax('https://api.allorigins.win/get?url=https://online-go.com/termination-api/game/52240703/state',
       {
           success: function(data, textStatus, jqXGR) {
               show($.parseJSON(data.contents).board)
           }
       }
      )
