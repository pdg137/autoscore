var board
var ownership_white
var ownership_black
var combined_ownership
var width
var height
var regions

function state_emoji(s) {
    switch(s) {
    case -1:
        return '⬛'
    case -2:
        return '⬜'
    case 1:
        return '⚫'
    case 2:
        return '⚪'
    case 0:
        return '➕'
    case -3:
        return '🖤'
    case -4:
        return '🤍'
    default:
        return '❓'
    }
}

function region_emoji(r) {
    return String.fromCodePoint(r+0x1f343)
}

function failed() {
    $('#white').text('Failed')
    $('#black').text('Failed')
    $('#combined').text('Failed')
}

function show() {
    width = board[0].length
    height = board.length
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

    $('#board').text(text)
    ajax_white = getEstimate('white')
    ajax_black = getEstimate('black')

    $.when(ajax_white, ajax_black).done(function(result_white, result_black) {
        if(result_white[1] != 'success' || result_black[1] != 'success')
        {
            failed()
            return
        }

        ownership_white = result_white[0].ownership
        ownership_black = result_black[0].ownership
        show_algorithm()
    })

}

function show_algorithm() {
    show_ownership(ownership_white, $('#white'))
    show_ownership(ownership_black, $('#black'))

    compute_combined_ownership()
    find_regions()
}

function find_regions() {
    // regions: array with 0 for live stones, and 1, 2, 3,
    // etc. for continguous regions of territory/dame/unsettled
    // points.
    //
    // remap_regions: hash mapping regions to other ones that turned
    // out to be the same.
    regions = []
    var remap_regions = {}
    var used_regions = 0

    for(var y=0; y<height; y++) {
        regions[y] = []

        for(var x=0; x<width; x++) {
            var v = combined_ownership[y][x]

            if(v > 0) {
                regions[y][x] = 0
                continue
            }

            var left = 0
            var up = 0
            if(x > 0)
                left = regions[y][x-1]
            if(y > 0)
                up = regions[y-1][x]

            if(!left && !up) {
                // start new region
                used_regions ++
                regions[y][x] = used_regions
                continue
            }

            if(left && up) {
                if(left > up) {
                    remap_regions[left] = up
                    regions[y][x] = up
                }
                else if(up > left) {
                    remap_regions[up] = left
                    regions[y][x] = left
                }
                else
                    regions[y][x] = up
            }
            else if(left)
                regions[y][x] = left
            else // up
                regions[y][x] = up
        }
    }

    // now remap the regions
    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            r = regions[y][x]
            while(remap_regions[r])
                r = remap_regions[r]
            regions[y][x] = r
        }
    }

    text = ''
    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            var r = regions[y][x]
            if(r == 0) {
                text += state_emoji(board[y][x])
            }
            else {
                text += region_emoji(r)
            }
        }
        text += "\n"
    }
    $('#regions').text(text)
}

function compute_combined_ownership() {
    var text = ''

    combined_ownership = []

    for(var y=0; y<height; y++) {
        combined_ownership[y] = []

        for(var x=0; x<width; x++) {
            var state = board[y][x]
            var owner1 = get_owner(ownership_white, x, y)
            var owner2 = get_owner(ownership_black, x, y)

            var owner = 0
            if(owner1 == owner2)
                owner = owner1

            var result = 0 // unknown
            if(state == owner) // live
                result = state
            else if(state == 1 && owner == 2) // dead black
                result = -1
            else if(state == 2 && owner == 1) // dead white
                result = -2
            else if(owner == 0 && state == 1) // unresolved black
                result = -3
            else if(owner == 0 && state == 2) // unresolved white
                result = -4

            combined_ownership[y][x] = result

            switch(result) {
            case -1:
                text += '⬛'
                break
            case -2:
                text += '⬜'
                break
            case 1:
                text += '⚫'
                break
            case 2:
                text += '⚪'
                break
            case 0:
                text += '➕'
                break
            case -3:
                text += '🖤'
                break
            case -4:
                text += '🤍'
                break
            default:
                text += '❓'
            }
        }
        text += "\n"
    }

    $('#combined').text(text)
}

function get_owner(ownership, x, y) {
    if(ownership[y][x] > 0)
        return 1
    else
        return 2
}

function show_ownership(ownership, element) {
    var text = ''

    for(var y=0; y<height; y++) {
        for(var x=0; x<width; x++) {
            var owner = get_owner(ownership, x, y) 
            if(owner == 1)
                text += '⚫'
            else
                text += '⚪'
        }
        text += "\n"
    }

    element.text(text)
}

//52240703
//49966513
function getBoard() {
    var urlParams = new URLSearchParams(window.location.search)
    var game = urlParams.get('game')
    $.ajax('https://api.allorigins.win/get?url=https://online-go.com/termination-api/game/'+game+'/state',
           {
               success: function(data, textStatus, jqXGR) {
                   board = $.parseJSON(data.contents).board
                   show()
               },
               error: failed
           }
          )
}

function getEstimate(player_to_move) {
    var data = {
        player_to_move: player_to_move,
        width: board[0].length,
        height: board.length,
        rules: 'aga',
        board_state: board
    }

    return $.ajax('https://ai.online-go.com/api/score',
           {
               type: 'post',
               data: JSON.stringify(data),
               contentType: 'application/json; charset=utf-8',
           }
          )
}

getBoard()
